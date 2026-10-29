import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, DatePicker, Empty, Segmented, Spin, Tooltip } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'
import type { AppDevice } from '@/features/device/api'
import { useCompanyId } from '@/hooks/session'
import { type ECharts, type ECOption, echarts, useECharts } from '@/hooks/useECharts'
import { decimalsOf } from '@/lib/resolution'
import { BIZ_TZ, bizNow, dayjs } from '@/lib/time'
import { ChannelPicker } from '../ChannelPicker'
import { saveBlob } from '../export/runExport'
import { bizToPicker, earliestDate, MAX_RANGE_DAYS, pickerToBiz, type Range } from '../export/timeRange'
import { downloadHistory } from '../history'
import { channelColor, groupByUnit } from '../lib/channelColor'
import { type AppSensor, byChannel, channelName } from '../lib/realtime'
import { HistoryWorker } from './historyWorker'

/** 每个通道降采样后的点数 (FRONTEND_DESIGN §5.3：约 2,000 点 / 通道) */
const POINTS = 2000
const MB = 1024 * 1024
const fmtMB = (n: number) => `${(n / MB).toFixed(n < 10 * MB ? 1 : 0)} MB`

type Preset = '1h' | 'today' | '7d' | '31d' | 'custom'
const PRESETS: { value: Preset; label: string }[] = [
  { value: '1h', label: '最近 1 小时' },
  { value: 'today', label: '今天' },
  { value: '7d', label: '最近 7 天' },
  { value: '31d', label: '最近 31 天' },
  { value: 'custom', label: '自定义' },
]

/** 快捷范围 → [开始, 结束) 毫秒；最早不早于上月 1 日 (明细只保留当月与上月) */
function presetRange(p: Exclude<Preset, 'custom'>): [number, number] {
  const now = bizNow()
  const start = {
    '1h': now.subtract(1, 'hour'),
    today: now.startOf('day'),
    '7d': now.subtract(6, 'day').startOf('day'),
    '31d': now.subtract(MAX_RANGE_DAYS, 'day'),
  }[p]
  const earliest = earliestDate()
  return [Math.max(start.valueOf(), earliest.valueOf()), now.valueOf()]
}

type Status =
  | { kind: 'loading'; received: number; parsing: boolean }
  | { kind: 'ready'; count: number }
  | { kind: 'error'; message: string }
  | { kind: 'canceled' }

type Series = Map<number, [number, number][]>

const toPairs = (a: Float64Array) =>
  Array.from({ length: a.length / 2 }, (_, i) => [a[i * 2], a[i * 2 + 1]] as [number, number])

/**
 * 历史曲线 (FRONTEND_DESIGN §5.3)
 * - fetch 流式下载显示进度、可取消；Worker 解析 JSON 并 LTTB 降采样 (约 2,000 点 / 通道)
 * - 按单位分组，一组一张图 (不用双 Y 轴)，多张图联动缩放；缩放后 Worker 按新区间重新降采样
 * - 导出 CSV 在 Worker 内生成
 */
export function HistoryPanel({
  device,
  channels,
  onChannelsChange,
}: {
  device: AppDevice
  channels: number[]
  onChannelsChange: (v: number[]) => void
}) {
  const companyId = useCompanyId()
  const sensors = byChannel(device.sensors)
  const [preset, setPreset] = useState<Preset>('today')
  const [range, setRange] = useState<[number, number]>(() => presetRange('today'))
  const [custom, setCustom] = useState<Range | null>(null)
  const [status, setStatus] = useState<Status>({ kind: 'loading', received: 0, parsing: false })
  const [series, setSeries] = useState<Series>(new Map())
  const [zoom, setZoom] = useState<[number, number] | null>(null)
  const [exporting, setExporting] = useState(false)
  const workerRef = useRef<HistoryWorker | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // 下载 + 解析：设备或时间范围变化时重新加载 (所有已配置通道一起解析，切换通道不用重新下载)
  const allChannels = sensors.map((s) => s.channel).join(',')
  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey 用于手动刷新
  useEffect(() => {
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const worker = new HistoryWorker()
    workerRef.current = worker
    setStatus({ kind: 'loading', received: 0, parsing: false })
    setSeries(new Map())
    setZoom(null)
    ;(async () => {
      try {
        const bytes = await downloadHistory({
          companyId,
          deviceId: device.id,
          start: dayjs(range[0]).tz(BIZ_TZ).format(),
          end: dayjs(range[1]).tz(BIZ_TZ).format(),
          signal: ctrl.signal,
          onProgress: (received) => setStatus({ kind: 'loading', received, parsing: false }),
        })
        if (ctrl.signal.aborted) return
        setStatus((s) => (s.kind === 'loading' ? { ...s, parsing: true } : s))
        const r = await worker.load(bytes, allChannels ? allChannels.split(',').map(Number) : [])
        if (!ctrl.signal.aborted) setStatus({ kind: 'ready', count: r.count })
      } catch (e) {
        if (ctrl.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return
        handleGlobalError(e, true)
        setStatus({ kind: 'error', message: e instanceof Error ? e.message : '加载失败' })
      }
    })()
    return () => {
      ctrl.abort()
      worker.terminate()
      if (workerRef.current === worker) workerRef.current = null
    }
  }, [companyId, device.id, range, allChannels, reloadKey])

  // 降采样：数据就绪、通道或缩放窗口变化时
  const channelKey = channels.join(',')
  useEffect(() => {
    const worker = workerRef.current
    if (status.kind !== 'ready' || !status.count || !worker || !channelKey) return
    let stale = false
    worker
      .sample(channelKey.split(',').map(Number), POINTS, zoom?.[0], zoom?.[1])
      .then((r) => {
        if (!stale) setSeries(new Map(r.series.map((s) => [s.channel, toPairs(s.data)])))
      })
      .catch(() => {})
    return () => {
      stale = true
    }
  }, [status, channelKey, zoom])

  const choosePreset = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') setRange(presetRange(p))
    else if (custom) setRange([pickerToBiz(custom[0]).valueOf(), pickerToBiz(custom[1]).valueOf()])
  }

  const exportCsv = async () => {
    const worker = workerRef.current
    if (!worker) return
    setExporting(true)
    try {
      const columns = sensors
        .filter((s) => channels.includes(s.channel))
        .map((s) => ({
          channel: s.channel,
          header: s.unit?.trim() ? `${channelName(s)} (${s.unit.trim()})` : channelName(s),
          decimals: decimalsOf(s.resolution),
        }))
      const r = await worker.csv(columns, BIZ_TZ)
      const f = (ms: number) => dayjs(ms).tz(BIZ_TZ).format('YYYYMMDDHHmm')
      saveBlob(
        r.blob,
        `${device.name}_${device.deviceSn}_${f(range[0])}-${f(range[1])}.csv`.replace(/[\\/:*?"<>|]/g, '_'),
      )
    } catch (e) {
      notify.error(`导出失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setExporting(false)
    }
  }

  const earliest = bizToPicker(earliestDate())
  const today = bizToPicker(bizNow().endOf('day'))
  const selected = sensors.filter((s) => channels.includes(s.channel))
  const groups = groupByUnit(selected)
  const group = `history-${device.id}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg bg-container px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Preset> value={preset} options={PRESETS} onChange={choosePreset} />
          {preset === 'custom' && (
            <DatePicker.RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              value={custom}
              disabledDate={(d, { from }) =>
                d.isBefore(earliest, 'day') ||
                d.isAfter(today, 'day') ||
                Boolean(from && Math.abs(d.diff(from, 'day', true)) > MAX_RANGE_DAYS)
              }
              onChange={(r) => {
                if (!r?.[0] || !r[1]) return
                const v: Range = [r[0], r[1]]
                setCustom(v)
                setRange([pickerToBiz(v[0]).valueOf(), pickerToBiz(v[1]).valueOf()])
              }}
            />
          )}
          <span className="text-fg-tertiary text-sm">
            {dayjs(range[0]).tz(BIZ_TZ).format('MM-DD HH:mm')} ~ {dayjs(range[1]).tz(BIZ_TZ).format('MM-DD HH:mm')}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Tooltip title="刷新">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => (preset === 'custom' ? setReloadKey((k) => k + 1) : setRange(presetRange(preset)))}
              />
            </Tooltip>
            <Button
              icon={<DownloadOutlined />}
              loading={exporting}
              disabled={status.kind !== 'ready' || !status.count}
              onClick={exportCsv}
            >
              导出 CSV
            </Button>
          </div>
        </div>
        <ChannelPicker sensors={sensors} value={channels} onChange={onChannelsChange} />
      </div>

      <div className="rounded-lg bg-container px-5 py-4">
        {status.kind === 'loading' ? (
          <div className="flex h-72 flex-col items-center justify-center gap-3 text-fg-secondary">
            <Spin />
            <span>{status.parsing ? '正在处理数据…' : `正在下载数据… 已接收 ${fmtMB(status.received)}`}</span>
            <Button
              size="small"
              onClick={() => {
                abortRef.current?.abort()
                setStatus({ kind: 'canceled' })
              }}
            >
              取消
            </Button>
          </div>
        ) : status.kind === 'canceled' ? (
          <Empty className="py-12" description="已取消加载">
            <Button onClick={() => setReloadKey((k) => k + 1)}>重新加载</Button>
          </Empty>
        ) : status.kind === 'error' ? (
          <Alert
            type="error"
            showIcon
            title="历史数据加载失败"
            description={status.message}
            action={
              <Button size="small" onClick={() => setReloadKey((k) => k + 1)}>
                重试
              </Button>
            }
          />
        ) : status.count === 0 ? (
          <Empty className="py-12" description="该时间段没有数据" />
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between text-fg-tertiary text-xs">
              <span>
                共 {status.count.toLocaleString()} 帧
                {status.count > POINTS && '，曲线已按形状抽稀；拖动下方滑块或滚轮缩放查看细节'}
              </span>
              {zoom && (
                <Button type="link" size="small" className="px-0" onClick={() => setZoom(null)}>
                  重置缩放
                </Button>
              )}
            </div>
            {groups.map((g, i) => (
              <UnitChart
                key={g.unit || '-'}
                group={group}
                unit={g.unit}
                sensors={g.sensors}
                allSensors={sensors}
                series={series}
                range={range}
                zoom={zoom}
                slider={i === groups.length - 1}
                onZoom={(z) => setZoom((prev) => (sameWindow(prev, z) ? prev : z))}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

const sameWindow = (a: [number, number] | null, b: [number, number] | null) =>
  a === b || Boolean(a && b && Math.abs(a[0] - b[0]) < 1000 && Math.abs(a[1] - b[1]) < 1000)

/** 一种单位一张图；同组图表联动缩放，最后一张带缩放滑块 */
function UnitChart({
  group,
  unit,
  sensors,
  allSensors,
  series,
  range,
  zoom,
  slider,
  onZoom,
}: {
  group: string
  unit: string
  sensors: AppSensor[]
  allSensors: AppSensor[]
  series: Series
  range: [number, number]
  zoom: [number, number] | null
  slider: boolean
  onZoom: (z: [number, number] | null) => void
}) {
  const decimals = Math.max(...sensors.map((s) => decimalsOf(s.resolution)))
  const sensorsKey = sensors.map((s) => `${s.channel}:${channelName(s)}`).join('|')
  // 只在数据、范围、缩放变化时重建图表配置 (避免父组件每秒刷新时重置提示框)
  // biome-ignore lint/correctness/useExhaustiveDependencies: sensors 以 sensorsKey 代表
  const option = useMemo<ECOption>(
    () => ({
      animation: false,
      color: sensors.map((s) => channelColor(allSensors, s.channel)),
      grid: { left: 8, right: 16, top: 36, bottom: slider ? 56 : 8, containLabel: true },
      legend: {
        top: 0,
        left: 0,
        icon: 'roundRect',
        itemWidth: 12,
        itemHeight: 3,
        textStyle: { color: '#475569' },
        formatter: (name: string) => (unit ? `${name} (${unit})` : name),
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: '#94a3b8' } },
        valueFormatter: (v) => (typeof v === 'number' ? `${v.toFixed(decimals)}${unit ? ` ${unit}` : ''}` : '—'),
      },
      xAxis: {
        type: 'time',
        min: range[0],
        max: range[1],
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#64748b', hideOverlap: true },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      dataZoom: [
        { type: 'inside', filterMode: 'none', startValue: zoom?.[0], endValue: zoom?.[1] },
        ...(slider
          ? [
              {
                type: 'slider' as const,
                filterMode: 'none' as const,
                height: 24,
                bottom: 8,
                startValue: zoom?.[0],
                endValue: zoom?.[1],
              },
            ]
          : []),
      ],
      series: sensors.map((s) => ({
        type: 'line' as const,
        name: channelName(s),
        showSymbol: false,
        sampling: undefined,
        lineStyle: { width: 2 },
        emphasis: { disabled: true },
        data: series.get(s.channel) ?? [],
      })),
    }),
    [sensorsKey, unit, decimals, series, range, zoom, slider],
  )

  const onZoomRef = useRef(onZoom)
  onZoomRef.current = onZoom
  const rangeRef = useRef(range)
  rangeRef.current = range
  const { ref } = useECharts(option, (chart: ECharts) => {
    chart.group = group
    echarts.connect(group)
    let timer: ReturnType<typeof setTimeout> | undefined
    chart.on('datazoom', () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const dz = (chart.getOption().dataZoom as { start?: number; end?: number }[] | undefined)?.[0]
        const [a, b] = rangeRef.current
        const start = dz?.start ?? 0
        const end = dz?.end ?? 100
        if (start <= 0.01 && end >= 99.99) onZoomRef.current(null)
        else onZoomRef.current([a + ((b - a) * start) / 100, a + ((b - a) * end) / 100])
      }, 250)
    })
    return () => clearTimeout(timer)
  })

  return <div ref={ref} style={{ height: slider ? 300 : 248 }} className="w-full" />
}
