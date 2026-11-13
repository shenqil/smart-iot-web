import type { AppDevice } from '@shared/api/device'
import { dailyComparisonQuery, monthlyComparisonQuery } from '@shared/telemetry/comparison/api'
import { earliestDate } from '@shared/telemetry/export/timeRange'
import { downloadHistory } from '@shared/telemetry/history'
import { HistoryWorker } from '@shared/telemetry/history/historyWorker'
import { channelColor, groupByUnit } from '@shared/telemetry/lib/channelColor'
import { dailySeries, hourlySeries } from '@shared/telemetry/lib/comparison'
import { byChannel, channelName } from '@shared/telemetry/lib/realtime'
import { useQuery } from '@tanstack/react-query'
import { Button, Checkbox } from 'antd-mobile'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { errorText } from '@/api/errors'
import { useCompanyId } from '@/hooks/session'
import { type ECharts, type ECOption, echarts, useECharts } from '@/hooks/useECharts'
import { decimalsOf } from '@/lib/resolution'
import { BIZ_TZ, bizNow, dayjs } from '@/lib/time'
import { comparisonDate, parseBizTime, validateRange } from '../analysisRange'
import { Card, Choice, mobileDialog as Dialog, Empty, Failure, Sheet, showFailure, mobileToast as Toast } from '../ui'

type Series = Map<number, [number, number][]>
type Phase = 'loading' | 'parsing' | 'ready' | 'error' | 'canceled'
export default function AnalysisPanel({ device, mode }: { device: AppDevice; mode: 'history' | 'comparison' }) {
  const [params, setParams] = useSearchParams(),
    sensors = byChannel(device.sensors),
    [open, setOpen] = useState(false)
  const channels =
    params
      .get('channels')
      ?.split(',')
      .map(Number)
      .filter((n) => sensors.some((s) => s.channel === n)) ?? sensors.slice(0, 2).map((s) => s.channel)
  const valid = [...new Set(channels)],
    [draft, setDraft] = useState(valid),
    [start, setStart] = useState(() => params.get('start') ?? bizNow().startOf('day').format('YYYY-MM-DDTHH:mm')),
    [end, setEnd] = useState(() => params.get('end') ?? bizNow().format('YYYY-MM-DDTHH:mm'))
  const [initialRange] = useState(() => ({
    start: params.get('start') ?? bizNow().startOf('day').format('YYYY-MM-DDTHH:mm'),
    end: params.get('end') ?? bizNow().format('YYYY-MM-DDTHH:mm'),
  }))
  const rangeStart = params.get('start') ?? initialRange.start,
    rangeEnd = params.get('end') ?? initialRange.end
  const period = params.get('period') === 'month' ? 'month' : 'day',
    date = comparisonDate(params.get('date')),
    month = comparisonDate(params.get('month'), true),
    overlay = params.get('overlay') !== 'false'
  const [draftPeriod, setDraftPeriod] = useState(period),
    [draftDate, setDraftDate] = useState(date),
    [draftMonth, setDraftMonth] = useState(month),
    [draftOverlay, setDraftOverlay] = useState(overlay)
  const patch = (values: Record<string, string>) =>
    setParams(
      (old) => {
        const p = new URLSearchParams(old)
        for (const [k, v] of Object.entries(values)) p.set(k, v)
        return p
      },
      { replace: true },
    )
  const apply = () => {
    if (!draft.length) {
      Toast.show('请至少选择一个通道')
      return
    }
    if (mode === 'history') {
      const error = validateRange(start, end)
      if (error) {
        Toast.show(error)
        return
      }
      patch({ channels: draft.join(','), start, end })
    } else
      patch({
        channels: draft.join(','),
        period: draftPeriod,
        date: draftDate,
        month: draftMonth,
        overlay: String(draftOverlay),
      })
    setOpen(false)
  }
  const preset = (p: string) => {
    const now = bizNow()
    let a =
      p === '1h'
        ? now.subtract(1, 'hour')
        : p === '7d'
          ? now.subtract(6, 'day').startOf('day')
          : p === '31d'
            ? now.subtract(31, 'day')
            : now.startOf('day')
    if (a.isBefore(earliestDate())) a = earliestDate()
    setStart(a.format('YYYY-MM-DDTHH:mm'))
    setEnd(now.format('YYYY-MM-DDTHH:mm'))
  }
  return (
    <>
      <Card
        title={mode === 'history' ? '历史曲线' : period === 'day' ? '日环比' : '月环比'}
        extra={
          <Button
            size="small"
            fill="none"
            onClick={() => {
              setDraftPeriod(period)
              setDraftDate(date)
              setDraftMonth(month)
              setDraftOverlay(overlay)
              setDraft(valid)
              setStart(rangeStart)
              setEnd(rangeEnd)
              setOpen(true)
            }}
          >
            时间 / 通道 ›
          </Button>
        }
      >
        <p className="h5-muted">
          {mode === 'history'
            ? `${rangeStart.replace('T', ' ')} — ${rangeEnd.replace('T', ' ')}`
            : period === 'day'
              ? `${date} 与前一天`
              : `${month} 与上月`}{' '}
          · {BIZ_TZ}
        </p>
        <p>
          {sensors
            .filter((s) => valid.includes(s.channel))
            .map(channelName)
            .join('、') || '未选择通道'}
        </p>
      </Card>
      {mode === 'history' ? (
        <History device={device} channels={valid} start={rangeStart} end={rangeEnd} />
      ) : (
        <Comparison device={device} channels={valid} period={period} date={date} month={month} overlay={overlay} />
      )}
      <Sheet
        title="分析条件"
        visible={open}
        close={() => setOpen(false)}
        footer={
          <Button block color="primary" onClick={apply}>
            应用条件
          </Button>
        }
      >
        {mode === 'history' ? (
          <>
            <Choice
              label="快捷时间"
              value="custom"
              options={[
                { label: '自定义', value: 'custom' },
                { label: '最近 1 小时', value: '1h' },
                { label: '今天', value: 'today' },
                { label: '最近 7 天', value: '7d' },
                { label: '最近 31 天', value: '31d' },
              ]}
              onChange={(v) => {
                if (v !== 'custom') preset(v)
              }}
            />
            <label className="h5-field">
              开始时间
              <input
                type="datetime-local"
                value={start}
                min={earliestDate().format('YYYY-MM-DDTHH:mm')}
                max={bizNow().format('YYYY-MM-DDTHH:mm')}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="h5-field">
              结束时间
              <input
                type="datetime-local"
                value={end}
                max={bizNow().format('YYYY-MM-DDTHH:mm')}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </>
        ) : (
          <>
            <Choice
              label="对比维度"
              value={draftPeriod}
              options={[
                { label: '日环比', value: 'day' },
                { label: '月环比', value: 'month' },
              ]}
              onChange={(v) => setDraftPeriod(v === 'month' ? 'month' : 'day')}
            />
            {draftPeriod === 'day' ? (
              <label className="h5-field">
                日期
                <input
                  type="date"
                  value={draftDate}
                  max={bizNow().format('YYYY-MM-DD')}
                  onChange={(e) => {
                    if (e.target.value && e.target.value <= bizNow().format('YYYY-MM-DD')) setDraftDate(e.target.value)
                  }}
                />
              </label>
            ) : (
              <label className="h5-field">
                月份
                <input
                  type="month"
                  value={draftMonth}
                  max={bizNow().format('YYYY-MM')}
                  onChange={(e) => {
                    if (e.target.value && e.target.value <= bizNow().format('YYYY-MM')) setDraftMonth(e.target.value)
                  }}
                />
              </label>
            )}
            <Checkbox checked={draftOverlay} onChange={(v) => setDraftOverlay(v)}>
              叠加{draftPeriod === 'day' ? '前一天' : '上月'}
            </Checkbox>
          </>
        )}
        <p className="h5-muted">选择传感器通道</p>
        <Checkbox.Group value={draft.map(String)} onChange={(v) => setDraft(v.map(Number))}>
          <div className="h5-choice-list">
            {sensors.map((s) => (
              <Checkbox key={s.channel} value={String(s.channel)}>
                {channelName(s)}（{s.unit || '无单位'}）
              </Checkbox>
            ))}
          </div>
        </Checkbox.Group>
      </Sheet>
    </>
  )
}
function History({
  device,
  channels,
  start,
  end,
}: {
  device: AppDevice
  channels: number[]
  start: string
  end: string
}) {
  const cid = useCompanyId(),
    [phase, setPhase] = useState<Phase>('loading'),
    [message, setMessage] = useState(''),
    [received, setReceived] = useState(0),
    [count, setCount] = useState(0),
    [reload, setReload] = useState(0),
    [series, setSeries] = useState<Series>(new Map()),
    [zoom, setZoom] = useState<[number, number] | null>(null),
    [exporting, setExporting] = useState(false)
  const worker = useRef<HistoryWorker | null>(null),
    ctrl = useRef<AbortController | null>(null),
    alive = useRef(true),
    exportVersion = useRef(0)
  const channelKey = channels.join(','),
    allKey = device.sensors.map((s) => s.channel).join(','),
    range = useMemo(
      () => [parseBizTime(start).valueOf(), parseBizTime(end).valueOf()] as [number, number],
      [start, end],
    )
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload intentionally starts a fresh download
  useEffect(() => {
    alive.current = true
    const controller = new AbortController()
    ctrl.current = controller
    let local: HistoryWorker | null = null,
      disposed = false
    setPhase('loading')
    setReceived(0)
    setSeries(new Map())
    setZoom(null)
    setCount(0)
    setExporting(false)
    exportVersion.current++
    const error = validateRange(start, end)
    if (error) {
      setPhase('error')
      setMessage(error)
      return () => {
        alive.current = false
      }
    }
    const run = async () => {
      try {
        local = new HistoryWorker()
        worker.current = local
        const bytes = await downloadHistory({
          companyId: cid,
          deviceSn: device.deviceSn,
          start: dayjs.tz(start, BIZ_TZ).format(),
          end: dayjs.tz(end, BIZ_TZ).format(),
          signal: controller.signal,
          onProgress: (n) => {
            if (!disposed) setReceived(n)
          },
        })
        if (disposed) return
        setPhase('parsing')
        const result = await local.load(bytes, allKey.split(',').map(Number))
        if (!disposed) {
          setCount(result.count)
          setPhase('ready')
        }
      } catch (e) {
        if (disposed) return
        if (controller.signal.aborted) setPhase('canceled')
        else {
          setMessage(errorText(e))
          setPhase('error')
        }
      }
    }
    void run()
    return () => {
      disposed = true
      alive.current = false
      exportVersion.current++
      controller.abort()
      local?.terminate()
      if (worker.current === local) worker.current = null
    }
  }, [cid, device.id, start, end, allKey, reload])
  useEffect(() => {
    if (phase !== 'ready' || !worker.current) return
    let stale = false
    void worker.current
      .sample(channelKey.split(',').filter(Boolean).map(Number), 1200, zoom?.[0], zoom?.[1])
      .then((r) => {
        if (!stale)
          setSeries(
            new Map(
              r.series.map((s) => [
                s.channel,
                Array.from(
                  { length: s.data.length / 2 },
                  (_, i) => [s.data[i * 2], s.data[i * 2 + 1]] as [number, number],
                ),
              ]),
            ),
          )
      })
      .catch((e) => {
        if (!stale) {
          setPhase('error')
          setMessage(errorText(e))
        }
      })
    return () => {
      stale = true
    }
  }, [phase, channelKey, zoom])
  const cancel = () => {
    exportVersion.current++
    ctrl.current?.abort()
    worker.current?.terminate()
    worker.current = null
    setExporting(false)
    setPhase('canceled')
  }
  const doExport = async () => {
    if (!worker.current || phase !== 'ready' || !count || !channels.length) return
    const version = ++exportVersion.current
    setExporting(true)
    try {
      const r = await worker.current.csv(
        byChannel(device.sensors)
          .filter((s) => channels.includes(s.channel))
          .map((s) => ({
            channel: s.channel,
            header: `${channelName(s)}${s.unit ? ` (${s.unit})` : ''}`,
            decimals: decimalsOf(s.resolution),
          })),
        BIZ_TZ,
      )
      if (!alive.current || version !== exportVersion.current) return
      const url = URL.createObjectURL(r.blob),
        a = document.createElement('a')
      a.href = url
      a.download =
        `${device.name}_${device.deviceSn}_${start.replace(/\D/g, '')}-${end.replace(/\D/g, '')}.csv`.replace(
          /[\\/:*?"<>|]/g,
          '_',
        )
      document.body.append(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      Toast.show('已发起下载；微信内如无法保存，请在浏览器中打开')
    } catch (e) {
      if (alive.current && version === exportVersion.current) showFailure(e)
    } finally {
      if (alive.current && version === exportVersion.current) setExporting(false)
    }
  }
  const selected = byChannel(device.sensors).filter((s) => channels.includes(s.channel))
  return (
    <>
      {phase === 'loading' || phase === 'parsing' ? (
        <Card title={phase === 'parsing' ? '正在解析数据' : '正在下载数据'}>
          <p role="status">已接收 {(received / 1024 / 1024).toFixed(2)} MB</p>
          <Button block onClick={cancel}>
            取消
          </Button>
        </Card>
      ) : phase === 'error' ? (
        <Failure error={new Error(message)} retry={() => setReload((v) => v + 1)} />
      ) : phase === 'canceled' ? (
        <Card title="任务已取消">
          <Button block onClick={() => setReload((v) => v + 1)}>
            重新加载
          </Button>
        </Card>
      ) : !count ? (
        <Empty title="当前时间范围暂无历史数据" />
      ) : (
        <>
          <div className="h5-notice">{count.toLocaleString()} 条原始记录 · 不同单位分图 · 缺失不补零</div>
          {groupByUnit(selected).map((g) => (
            <Card key={g.unit} title={g.unit || '无单位通道'}>
              <HistoryChart
                sensors={g.sensors}
                all={device.sensors}
                unit={g.unit}
                series={series}
                range={range}
                zoom={zoom}
                onZoom={setZoom}
                group={`h5-history-${cid}-${device.id}`}
              />
            </Card>
          ))}
          {zoom && (
            <Button block onClick={() => setZoom(null)}>
              恢复完整时间范围
            </Button>
          )}
        </>
      )}
      <div className="h5-export-actions">
        <Button
          block
          color="primary"
          disabled={phase !== 'ready' || !count || !channels.length}
          loading={exporting}
          onClick={async () => {
            if (
              await Dialog.confirm({
                title: '导出原始明细 CSV？',
                content: `${device.name}\n${start.replace('T', ' ')} — ${end.replace('T', ' ')}\n${selected.map(channelName).join('、')}\n导出完整查询范围，包含未降采样的原始记录。`,
              })
            ) {
              await doExport()
            }
          }}
        >
          导出原始明细 CSV
        </Button>
        {exporting && (
          <Button block onClick={cancel}>
            取消导出
          </Button>
        )}
      </div>
    </>
  )
}
function HistoryChart({
  sensors,
  all,
  unit,
  series,
  range,
  zoom,
  onZoom,
  group,
}: {
  sensors: AppDevice['sensors']
  all: AppDevice['sensors']
  unit: string
  series: Series
  range: [number, number]
  zoom: [number, number] | null
  onZoom: (z: [number, number] | null) => void
  group: string
}) {
  const onZoomRef = useRef(onZoom),
    rangeRef = useRef(range)
  onZoomRef.current = onZoom
  rangeRef.current = range
  const option = useMemo<ECOption>(
    () => ({
      animation: false,
      color: sensors.map((s) => channelColor(all, s.channel)),
      grid: { left: 8, right: 12, top: 44, bottom: 46, containLabel: true },
      legend: { type: 'scroll', top: 0, textStyle: { fontSize: 11 } },
      tooltip: {
        trigger: 'axis',
        renderMode: 'richText',
        confine: true,
        valueFormatter: (v) => (typeof v === 'number' ? `${v.toFixed(2)} ${unit}` : '—'),
      },
      xAxis: {
        type: 'time',
        min: range[0],
        max: range[1],
        axisLabel: {
          hideOverlap: true,
          fontSize: 11,
          formatter: (v: number) => dayjs(v).tz(BIZ_TZ).format('MM-DD HH:mm'),
        },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { fontSize: 11 },
        splitLine: { lineStyle: { color: '#eef2f6' } },
      },
      dataZoom: [
        {
          type: 'inside',
          filterMode: 'none',
          startValue: zoom?.[0],
          endValue: zoom?.[1],
          preventDefaultMouseMove: false,
        },
        { type: 'slider', filterMode: 'none', height: 20, bottom: 5, startValue: zoom?.[0], endValue: zoom?.[1] },
      ],
      series: sensors.map((s) => ({
        type: 'line',
        name: channelName(s),
        showSymbol: false,
        connectNulls: false,
        data: series.get(s.channel) ?? [],
      })),
    }),
    [sensors, all, unit, series, range, zoom],
  )
  const { ref } = useECharts(option, (chart: ECharts) => {
    chart.group = group
    echarts.connect(group)
    let timer: ReturnType<typeof setTimeout> | undefined
    chart.on('datazoom', () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const dz = (chart.getOption().dataZoom as { start?: number; end?: number }[])?.[0],
          a = rangeRef.current[0],
          b = rangeRef.current[1],
          start = dz?.start ?? 0,
          end = dz?.end ?? 100
        onZoomRef.current(
          start <= 0.01 && end >= 99.99 ? null : [a + ((b - a) * start) / 100, a + ((b - a) * end) / 100],
        )
      }, 250)
    })
    return () => {
      clearTimeout(timer)
    }
  })
  return (
    <div
      ref={ref}
      className="h5-chart"
      role="img"
      aria-label={`${sensors.map(channelName).join('、')}历史曲线，单位${unit || '无'}，可缩放与点击读数`}
    />
  )
}
function Comparison({
  device,
  channels,
  period,
  date,
  month,
  overlay,
}: {
  device: AppDevice
  channels: number[]
  period: 'day' | 'month'
  date: string
  month: string
  overlay: boolean
}) {
  const cid = useCompanyId(),
    prevDate = dayjs(date).subtract(1, 'day').format('YYYY-MM-DD'),
    prevMonth = dayjs(`${month}-01`).subtract(1, 'month').format('YYYY-MM')
  const currentDay = useQuery({ ...dailyComparisonQuery(cid, device.deviceSn, date), enabled: period === 'day' }),
    previousDay = useQuery({
      ...dailyComparisonQuery(cid, device.deviceSn, prevDate),
      enabled: period === 'day' && overlay,
    }),
    currentMonth = useQuery({ ...monthlyComparisonQuery(cid, device.deviceSn, month), enabled: period === 'month' }),
    previousMonth = useQuery({
      ...monthlyComparisonQuery(cid, device.deviceSn, prevMonth),
      enabled: period === 'month' && overlay,
    })
  const current = period === 'day' ? currentDay : currentMonth,
    previous = period === 'day' ? previousDay : previousMonth
  const categories =
    period === 'day'
      ? Array.from({ length: 24 }, (_, i) => `${i}时`)
      : Array.from(
          {
            length: Math.max(dayjs(`${month}-01`).daysInMonth(), overlay ? dayjs(`${prevMonth}-01`).daysInMonth() : 0),
          },
          (_, i) => `${i + 1}日`,
        )
  return (
    <>
      <p className="h5-notice">
        {period === 'day' ? '每小时收到的第一帧快照' : '每天 12:00 起收到的第一帧快照'}
        ，不是平均值。缺失与月份多出的日号均不补零。
      </p>
      {current.isError ? (
        <Failure
          error={current.error}
          retry={() => {
            void current.refetch()
          }}
        />
      ) : current.isPending ? (
        <Card title="正在加载对比数据">
          <p role="status">请稍候…</p>
        </Card>
      ) : !current.data?.records?.length ? (
        <Empty title="当前周期暂无快照数据" />
      ) : (
        byChannel(device.sensors)
          .filter((s) => channels.includes(s.channel))
          .map((s) => {
            const cur =
                period === 'day'
                  ? hourlySeries(currentDay.data?.records, s.channel)
                  : dailySeries(currentMonth.data?.records, s.channel, month),
              prev = overlay
                ? period === 'day'
                  ? hourlySeries(previousDay.data?.records, s.channel)
                  : dailySeries(previousMonth.data?.records, s.channel, prevMonth)
                : null
            return (
              <Card key={s.channel} title={`${channelName(s)}${s.unit ? `（${s.unit}）` : ''}`}>
                <CompareChart
                  categories={categories}
                  current={cur}
                  previous={prev}
                  labels={[period === 'day' ? date : month, period === 'day' ? prevDate : prevMonth]}
                  unit={s.unit}
                />
              </Card>
            )
          })
      )}
      {overlay && previous.isError && (
        <Failure
          error={previous.error}
          retry={() => {
            void previous.refetch()
          }}
        />
      )}
    </>
  )
}
function CompareChart({
  categories,
  current,
  previous,
  labels,
  unit,
}: {
  categories: string[]
  current: (number | null)[]
  previous: (number | null)[] | null
  labels: string[]
  unit: string
}) {
  const option = useMemo<ECOption>(
    () => ({
      animation: false,
      color: ['#0f766e', '#92a3b7'],
      grid: { left: 8, right: 12, top: 44, bottom: 10, containLabel: true },
      legend: { top: 0, textStyle: { fontSize: 11 } },
      tooltip: {
        trigger: 'axis',
        renderMode: 'richText',
        confine: true,
        valueFormatter: (v) => (typeof v === 'number' ? `${v.toFixed(2)} ${unit}` : '缺失'),
      },
      xAxis: { type: 'category', data: categories, axisLabel: { hideOverlap: true, fontSize: 11 } },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { fontSize: 11 },
        splitLine: { lineStyle: { color: '#eef2f6' } },
      },
      series: [
        {
          type: 'line',
          name: labels[0],
          connectNulls: false,
          data: Array.from({ length: categories.length }, (_, i) => current[i] ?? null),
        },
        ...(previous
          ? [
              {
                type: 'line' as const,
                name: labels[1],
                connectNulls: false,
                lineStyle: { type: 'dashed' as const },
                data: Array.from({ length: categories.length }, (_, i) => previous[i] ?? null),
              },
            ]
          : []),
      ],
    }),
    [categories, current, previous, labels, unit],
  )
  const { ref } = useECharts(option)
  return <div ref={ref} className="h5-chart" role="img" aria-label={`当前周期和上一周期对比，单位${unit}`} />
}
