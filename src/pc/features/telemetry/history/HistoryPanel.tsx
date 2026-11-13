import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, DatePicker, Empty, Segmented, Spin, Tooltip } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'
import type { AppDevice } from '@/features/device/api'
import { useCompanyId } from '@/hooks/session'
import { type ECharts, type ECOption, useECharts } from '@/hooks/useECharts'
import { decimalsOf } from '@/lib/resolution'
import { BIZ_TZ, bizNow, dayjs } from '@/lib/time'
import { ChannelPicker } from '../ChannelPicker'
import { saveBlob } from '../export/runExport'
import { bizToPicker, earliestDate, MAX_RANGE_DAYS, pickerToBiz, type Range } from '../export/timeRange'
import { downloadHistory, downloadHistoryExport, HISTORY_POINTS, mergeWindow, toSeries } from '../history'
import { channelColor } from '../lib/channelColor'
import { type AppSensor, byChannel, channelName } from '../lib/realtime'
import { HistoryWorker } from './historyWorker'

const EMPTY_SERIES: [number, number][] = []

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
  | { kind: 'loading' }
  | { kind: 'ready'; count: number }
  | { kind: 'error'; message: string }
  | { kind: 'canceled' }

type Series = Map<number, [number, number][]>

const sameWindow = (a: [number, number] | null, b: [number, number] | null) =>
  a === b || Boolean(a && b && Math.abs(a[0] - b[0]) < 1000 && Math.abs(a[1] - b[1]) < 1000)

/**
 * 历史曲线：服务端按时间分桶，每个桶返回最早的一帧。
 * 缩放时按可见窗口再请求一次；窗口外保留第一次的概览。CSV 走原始导出。
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
  const [status, setStatus] = useState<Status>({ kind: 'loading' })
  const [series, setSeries] = useState<Series>(new Map())
  const [exporting, setExporting] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const overviewRef = useRef(new Map<number, [number, number][]>())
  const [reloadKey, setReloadKey] = useState(0)

  // 设备或时间范围变化时重新加载。切换通道只改变展示，不重新请求。
  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey 用于手动刷新
  useEffect(() => {
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setStatus({ kind: 'loading' })
    setSeries(new Map())
    ;(async () => {
      try {
        const sample = await downloadHistory({
          companyId,
          deviceSn: device.deviceSn,
          start: dayjs(range[0]).tz(BIZ_TZ).format(),
          end: dayjs(range[1]).tz(BIZ_TZ).format(),
          points: HISTORY_POINTS,
          signal: ctrl.signal,
        })
        if (ctrl.signal.aborted) return
        const next = toSeries(sample)
        overviewRef.current = next
        setSeries(next)
        setStatus({ kind: 'ready', count: sample.frames })
      } catch (e) {
        if (ctrl.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return
        handleGlobalError(e, true)
        setStatus({ kind: 'error', message: e instanceof Error ? e.message : '加载失败' })
      }
    })()
    return () => {
      ctrl.abort()
    }
  }, [companyId, device.id, range, reloadKey])

  const sampleChannel = useCallback(
    async (channel: number, from?: number, to?: number) => {
      if (from == null || to == null) return overviewRef.current.get(channel) ?? []
      const sample = await downloadHistory({
        companyId,
        deviceSn: device.deviceSn,
        start: dayjs(from).tz(BIZ_TZ).format(),
        end: dayjs(to).tz(BIZ_TZ).format(),
        points: HISTORY_POINTS,
      })
      return mergeWindow(overviewRef.current.get(channel) ?? [], toSeries(sample).get(channel) ?? [], from, to)
    },
    [companyId, device.deviceSn],
  )

  const choosePreset = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') setRange(presetRange(p))
    else if (custom) setRange([pickerToBiz(custom[0]).valueOf(), pickerToBiz(custom[1]).valueOf()])
  }

  const exportCsv = async () => {
    setExporting(true)
    const worker = new HistoryWorker()
    try {
      const bytes = await downloadHistoryExport({
        companyId,
        deviceSn: device.deviceSn,
        start: dayjs(range[0]).tz(BIZ_TZ).format(),
        end: dayjs(range[1]).tz(BIZ_TZ).format(),
      })
      await worker.load(
        bytes,
        sensors.map((sensor) => sensor.channel),
      )
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
      worker.terminate()
      setExporting(false)
    }
  }

  const earliest = bizToPicker(earliestDate())
  const today = bizToPicker(bizNow().endOf('day'))
  const selected = sensors.filter((s) => channels.includes(s.channel))

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

      {status.kind === 'loading' ? (
        <div className="rounded-lg bg-container px-5 py-4">
          <div className="flex h-72 flex-col items-center justify-center gap-3 text-fg-secondary">
            <Spin />
            <span>正在加载曲线…</span>
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
        </div>
      ) : status.kind === 'canceled' ? (
        <div className="rounded-lg bg-container py-12">
          <Empty description="已取消加载">
            <Button onClick={() => setReloadKey((k) => k + 1)}>重新加载</Button>
          </Empty>
        </div>
      ) : status.kind === 'error' ? (
        <div className="rounded-lg bg-container p-5">
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
        </div>
      ) : status.count === 0 ? (
        <div className="rounded-lg bg-container py-12">
          <Empty description="该时间段没有数据" />
        </div>
      ) : selected.length === 0 ? (
        <div className="rounded-lg bg-container py-12">
          <Empty description="请在上方选择需要查看的传感器通道" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-1 text-fg-tertiary text-xs">
            <span>
              共 {status.count.toLocaleString()} 帧
              {status.count > HISTORY_POINTS && '，曲线按时间桶取样，每个桶显示最早的一帧；拖动各通道下方滑块或滚轮可单独缩放查看细节'}
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {selected.map((sensor) => (
              <ChannelHistoryCard
                key={sensor.channel}
                sensor={sensor}
                allSensors={sensors}
                range={range}
                initialData={series.get(sensor.channel) ?? EMPTY_SERIES}
                onSample={(from, to) => sampleChannel(sensor.channel, from, to)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** 单通道独立卡片：单独图表、独立滚动与缩放、自带数据缩放滑块及指标统计 */
function ChannelHistoryCard({
  sensor,
  allSensors,
  range,
  initialData,
  onSample,
}: {
  sensor: AppSensor
  allSensors: AppSensor[]
  range: [number, number]
  initialData: [number, number][]
  onSample: (from?: number, to?: number) => Promise<[number, number][]>
}) {
  const [data, setData] = useState<[number, number][]>(initialData)
  const [zoom, setZoom] = useState<[number, number] | null>(null)
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const onSampleRef = useRef(onSample)
  onSampleRef.current = onSample
  const rangeRef = useRef(range)
  rangeRef.current = range
  const initialDataRef = useRef(initialData)
  initialDataRef.current = initialData

  // 外部全量数据或范围变更时重置
  useEffect(() => {
    setData(initialData)
    setZoom(null)
  }, [initialData])

  const decimals = decimalsOf(sensor.resolution)
  const color = channelColor(allSensors, sensor.channel)
  const unit = sensor.unit?.trim()

  // 统计指标：最新值、最大值、最小值、平均值 (当前视窗范围)
  const stats = useMemo(() => {
    if (!data.length) return null
    const [wStart, wEnd] = zoom ?? range
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    let sum = 0
    let count = 0
    let latestTime = -1
    let latestVal: number | null = null

    for (let i = 0; i < data.length; i++) {
      const [t, v] = data[i]
      if (t >= wStart && t <= wEnd && typeof v === 'number' && !Number.isNaN(v)) {
        if (v < min) min = v
        if (v > max) max = v
        sum += v
        count++
        if (t > latestTime) {
          latestTime = t
          latestVal = v
        }
      }
    }
    if (count === 0) return null
    return {
      min: min.toFixed(decimals),
      max: max.toFixed(decimals),
      avg: (sum / count).toFixed(decimals),
      latest: latestVal != null ? latestVal.toFixed(decimals) : '—',
    }
  }, [data, decimals, zoom, range])

  const option = useMemo<ECOption>(
    () => ({
      animation: false,
      color: [color],
      grid: { left: 8, right: 16, top: 16, bottom: 44, containLabel: true },
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
        {
          type: 'slider',
          filterMode: 'none',
          height: 20,
          bottom: 4,
          startValue: zoom?.[0],
          endValue: zoom?.[1],
        },
      ],
      series: [
        {
          type: 'line',
          name: channelName(sensor),
          showSymbol: false,
          sampling: undefined,
          lineStyle: { width: 2 },
          areaStyle: { opacity: 0.06 },
          emphasis: { disabled: true },
          data,
        },
      ],
    }),
    [color, decimals, unit, range, zoom, sensor, data],
  )

  const { ref, chart: chartRef } = useECharts(option, (chart: ECharts) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    chart.on('datazoom', () => {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        const dz = (chart.getOption().dataZoom as { start?: number; end?: number }[] | undefined)?.[0]
        const [a, b] = rangeRef.current
        const start = dz?.start ?? 0
        const end = dz?.end ?? 100
        if (start <= 0.01 && end >= 99.99) {
          if (zoomRef.current !== null) {
            setZoom(null)
            setData(initialDataRef.current)
          }
        } else {
          const from = a + ((b - a) * start) / 100
          const to = a + ((b - a) * end) / 100
          const nextZoom: [number, number] = [from, to]
          if (!sameWindow(zoomRef.current, nextZoom)) {
            setZoom(nextZoom)
            try {
              const sampled = await onSampleRef.current(from, to)
              if (sameWindow(zoomRef.current, nextZoom)) setData(sampled)
            } catch {}
          }
        }
      }, 250)
    })
    return () => clearTimeout(timer)
  })

  const handleResetZoom = () => {
    setZoom(null)
    setData(initialDataRef.current)
    chartRef.current?.dispatchAction({
      type: 'dataZoom',
      start: 0,
      end: 100,
    })
  }

  return (
    <div className="rounded-lg bg-container px-5 py-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-line border-b border-solid pb-3">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-base text-fg-primary">{channelName(sensor)}</span>
          {unit && <span className="text-fg-tertiary text-xs">({unit})</span>}
          <span className="rounded bg-fill-tertiary px-1.5 py-0.5 text-fg-tertiary text-xs">通道 {sensor.channel}</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          {stats ? (
            <div className="flex flex-wrap items-center gap-3 text-fg-tertiary">
              <span>
                最新 <strong className="font-medium text-fg-primary">{stats.latest}</strong>
                {unit && <span className="ml-0.5 opacity-80">{unit}</span>}
              </span>
              <span>
                最高 <strong className="font-medium text-fg-primary">{stats.max}</strong>
                {unit && <span className="ml-0.5 opacity-80">{unit}</span>}
              </span>
              <span>
                最低 <strong className="font-medium text-fg-primary">{stats.min}</strong>
                {unit && <span className="ml-0.5 opacity-80">{unit}</span>}
              </span>
              <span>
                平均 <strong className="font-medium text-fg-primary">{stats.avg}</strong>
                {unit && <span className="ml-0.5 opacity-80">{unit}</span>}
              </span>
            </div>
          ) : (
            <span className="text-fg-tertiary">该通道暂无数据</span>
          )}
          {zoom && (
            <Button type="link" size="small" className="h-auto p-0 text-xs" onClick={handleResetZoom}>
              重置缩放
            </Button>
          )}
        </div>
      </div>
      <div ref={ref} className="h-64 w-full" />
    </div>
  )
}
