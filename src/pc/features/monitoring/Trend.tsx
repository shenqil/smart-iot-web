import { Card, Empty } from 'antd'
import type { Schemas } from '@/api/client'
import { type ECOption, echarts, SERIES_COLORS, useECharts } from '@/shared/hooks/useECharts'

export type Window = '15m' | '1h' | '24h'
export type Sample = NonNullable<Schemas['AdminMonitoringSnapshot']['series'][string]>[number]

const windows = { '15m': 900, '1h': 3600, '24h': 86400 }
export const format = (value?: number) =>
  value === undefined ? '—' : value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })

export function Trend({
  title,
  unit,
  lines,
  at,
  window,
}: {
  title: string
  unit: string
  lines: { name: string; sample?: Sample }[]
  at: number
  window: Window
}) {
  const duration = windows[window]
  const start = at - duration
  const step = Math.max(15, Math.floor(duration / 180))
  const hasData = lines.some(({ sample }) => sample?.values?.length)
  const option: ECOption = {
    animation: false,
    color: SERIES_COLORS,
    tooltip: { trigger: 'axis', valueFormatter: (value) => (value == null ? '—' : `${format(Number(value))} ${unit}`) },
    legend: { show: lines.length > 1 },
    grid: { left: 58, right: 18, top: 36, bottom: 30 },
    xAxis: { type: 'time', min: start * 1000, max: at * 1000 },
    yAxis: { type: 'value', min: 0, name: unit },
    series: lines.map(({ name, sample }) => {
      const points = new Map(sample?.values?.map(({ time, value }) => [time, value]))
      return {
        type: 'line',
        name,
        showSymbol: false,
        connectNulls: false,
        data: Array.from({ length: Math.floor(duration / step) + 1 }, (_, index) => {
          const time = start + (duration % step) + index * step
          return [time * 1000, points.get(time) ?? null]
        }),
      }
    }),
  }
  const { ref } = useECharts(option, (chart) => {
    chart.group = 'admin-monitoring'
    echarts.connect('admin-monitoring')
    return () => {
      chart.group = ''
    }
  })
  const plot = (
    <div className="relative">
      <div role="img" aria-label={title} ref={ref} style={{ height: 225 }} />
      {!hasData && (
        <div className="absolute inset-0 grid place-content-center bg-white/85">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无采样数据" />
        </div>
      )}
    </div>
  )
  return (
    <Card size="small" title={title}>
      {plot}
    </Card>
  )
}
