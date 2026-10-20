import { InfoCircleOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Checkbox, DatePicker, Empty, Segmented, Skeleton, Tooltip } from 'antd'
import { useMemo, useState } from 'react'
import type { AppDevice } from '@/features/device/api'
import { useCompanyId } from '@/hooks/session'
import { type ECOption, useECharts } from '@/hooks/useECharts'
import { decimalsOf } from '@/lib/resolution'
import { bizNow, dayjs } from '@/lib/time'
import { ChannelPicker } from '../ChannelPicker'
import { channelColor } from '../lib/channelColor'
import { dailySeries, hourlySeries } from '../lib/comparison'
import { type AppSensor, byChannel, channelName } from '../lib/realtime'
import { dailyComparisonQuery, monthlyComparisonQuery } from './api'

type Mode = 'day' | 'month'

const HINT: Record<Mode, string> = {
  day: '整点值：每小时收到的第一帧数据，不是平均值；设备在整点不在线时取之后收到的数据',
  month: '每日值：每天 12:00 起收到的第一帧数据，不是平均值',
}

/**
 * 日 / 月环比 (FRONTEND_DESIGN §5.3)：每个选中通道一张小图，可叠加前一天 / 上月
 * 值为该时段收到的第一帧 (后端快照)，文案不写"平均"
 */
export function ComparisonPanel({
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
  const [mode, setMode] = useState<Mode>('day')
  const [date, setDate] = useState(() => bizNow().format('YYYY-MM-DD'))
  const [month, setMonth] = useState(() => bizNow().format('YYYY-MM'))
  const [overlay, setOverlay] = useState(true)

  const prevDate = dayjs(date).subtract(1, 'day').format('YYYY-MM-DD')
  const prevMonth = dayjs(`${month}-01`).subtract(1, 'month').format('YYYY-MM')
  const day = useQuery({ ...dailyComparisonQuery(companyId, device.id, date), enabled: mode === 'day' })
  const dayPrev = useQuery({
    ...dailyComparisonQuery(companyId, device.id, prevDate),
    enabled: mode === 'day' && overlay,
  })
  const mon = useQuery({ ...monthlyComparisonQuery(companyId, device.id, month), enabled: mode === 'month' })
  const monPrev = useQuery({
    ...monthlyComparisonQuery(companyId, device.id, prevMonth),
    enabled: mode === 'month' && overlay,
  })

  const current = mode === 'day' ? day : mon
  const label =
    mode === 'day'
      ? { cur: dayjs(date).format('M月D日'), prev: '前一天' }
      : { cur: dayjs(`${month}-01`).format('YYYY年M月'), prev: '上月' }
  const days = dayjs(`${month}-01`).daysInMonth()
  const prevDays = dayjs(`${prevMonth}-01`).daysInMonth()
  const categories =
    mode === 'day'
      ? Array.from({ length: 24 }, (_, h) => `${h}时`)
      : Array.from({ length: Math.max(days, overlay ? prevDays : 0) }, (_, d) => `${d + 1}日`)

  const seriesOf = (ch: number) => {
    if (mode === 'day')
      return {
        cur: hourlySeries(day.data?.records, ch),
        prev: overlay ? hourlySeries(dayPrev.data?.records, ch) : null,
      }
    return {
      cur: dailySeries(mon.data?.records, ch, month),
      prev: overlay ? dailySeries(monPrev.data?.records, ch, prevMonth) : null,
    }
  }

  const today = bizNow().endOf('day')
  const selected = sensors.filter((s) => channels.includes(s.channelNum))
  const empty = current.data && !current.data.records?.length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg bg-container px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<Mode>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'day', label: '日环比' },
              { value: 'month', label: '月环比' },
            ]}
          />
          {mode === 'day' ? (
            <DatePicker
              allowClear={false}
              value={dayjs(date)}
              disabledDate={(d) => d.isAfter(today, 'day')}
              onChange={(d) => d && setDate(d.format('YYYY-MM-DD'))}
            />
          ) : (
            <DatePicker
              picker="month"
              allowClear={false}
              value={dayjs(`${month}-01`)}
              disabledDate={(d) => d.isAfter(today, 'month')}
              onChange={(d) => d && setMonth(d.format('YYYY-MM'))}
            />
          )}
          <Checkbox checked={overlay} onChange={(e) => setOverlay(e.target.checked)}>
            叠加{label.prev}
          </Checkbox>
          <Tooltip title={HINT[mode]}>
            <span className="cursor-help text-fg-tertiary text-sm">
              <InfoCircleOutlined className="mr-1" />
              {mode === 'day' ? '整点值' : '每日值'}，不是平均值
            </span>
          </Tooltip>
        </div>
        <ChannelPicker sensors={sensors} value={channels} onChange={onChannelsChange} />
      </div>

      {current.isPending ? (
        <div className="rounded-lg bg-container p-5">
          <Skeleton active />
        </div>
      ) : empty ? (
        <div className="rounded-lg bg-container py-12">
          <Empty description={mode === 'day' ? '当天没有整点数据' : '当月没有每日数据'} />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {selected.map((s) => {
            const { cur, prev } = seriesOf(s.channelNum)
            return (
              <MiniChart
                key={s.channelNum}
                sensor={s}
                color={channelColor(sensors, s.channelNum)}
                categories={categories}
                cur={cur}
                prev={prev}
                curLabel={label.cur}
                prevLabel={label.prev}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function MiniChart({
  sensor,
  color,
  categories,
  cur,
  prev,
  curLabel,
  prevLabel,
}: {
  sensor: AppSensor
  color: string
  categories: string[]
  cur: (number | null)[]
  prev: (number | null)[] | null
  curLabel: string
  prevLabel: string
}) {
  const unit = sensor.unit?.trim() ?? ''
  const decimals = decimalsOf(sensor.resolution)
  const key = JSON.stringify([categories.length, cur, prev, color, curLabel])
  // biome-ignore lint/correctness/useExhaustiveDependencies: 以 key 代表数据内容
  const option = useMemo<ECOption>(
    () => ({
      animation: false,
      grid: { left: 8, right: 16, top: prev ? 32 : 16, bottom: 8, containLabel: true },
      legend: prev
        ? { top: 0, right: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 3, textStyle: { color: '#475569' } }
        : undefined,
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v) => (typeof v === 'number' ? `${v.toFixed(decimals)}${unit ? ` ${unit}` : ''}` : '无数据'),
      },
      xAxis: {
        type: 'category',
        data: categories,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#64748b', hideOverlap: true },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [
        {
          type: 'line',
          name: curLabel,
          data: cur,
          color,
          lineStyle: { width: 2 },
          symbolSize: 6,
          connectNulls: false,
        },
        ...(prev
          ? [
              {
                type: 'line' as const,
                name: prevLabel,
                data: prev,
                color: '#94a3b8',
                lineStyle: { width: 2, type: 'dashed' as const },
                symbol: 'none',
                connectNulls: false,
              },
            ]
          : []),
      ],
    }),
    [key, unit, decimals, prevLabel],
  )
  const { ref } = useECharts(option)
  const has = cur.some((v) => v != null)
  return (
    <div className="rounded-lg bg-container px-4 pt-3 pb-2">
      <div className="flex items-baseline gap-2">
        <span className="font-medium">{channelName(sensor)}</span>
        {unit && <span className="text-fg-tertiary text-xs">{unit}</span>}
        {!has && <span className="ml-auto text-fg-tertiary text-xs">该通道没有数据</span>}
      </div>
      <div ref={ref} className="h-56 w-full" />
    </div>
  )
}
