import { Collapse, Grid } from 'antd-mobile'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
export function StatRing({ value, label, color = '#0f766e' }: { value: number | null; label: string; color?: string }) {
  return (
    <div
      className="h5-ring"
      role="img"
      aria-label={`${label} ${value == null ? '未知' : `${value.toFixed(1)}%`}`}
      style={{ '--ring': `${Math.min(100, Math.max(0, value ?? 0))}%`, '--ring-color': color } as CSSProperties}
    >
      <div>
        <strong>{value == null ? '—' : `${value.toFixed(1)}%`}</strong>
        <small>{label}</small>
      </div>
    </div>
  )
}

export function MetricGrid({ items }: { items: { label: string; value: React.ReactNode; to: string }[] }) {
  return (
    <Grid columns={items.length} className="h5-metrics">
      {items.map((item) => (
        <Grid.Item key={item.label}>
          <Link to={item.to}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </Link>
        </Grid.Item>
      ))}
    </Grid>
  )
}
const palette = ['#147d64', '#63aa8a', '#5e91b8', '#b4a66a', '#8e8db7', '#d09b79', '#7eaaa8', '#a5b6a9']
export function DistributionChart({
  items,
  total,
}: {
  items: { key: string; label: string; count: number; to: string }[]
  total: number
}) {
  let cursor = 0
  const gradient = items
    .map((item, index) => {
      const start = cursor
      cursor += total > 0 ? (item.count / total) * 100 : 0
      return `${palette[index % palette.length]} ${start}% ${cursor}%`
    })
    .join(',')
  const row = (item: (typeof items)[number], i: number) => (
    <Link key={item.key} to={item.to}>
      <i style={{ background: palette[i % palette.length] }} />
      <span>{item.label}</span>
      <b>{item.count}</b>
      <small>{total ? ((item.count / total) * 100).toFixed(0) : '0'}%</small>
    </Link>
  )
  return (
    <div className="h5-distribution">
      <div
        className="h5-type-ring"
        style={{ background: total ? `conic-gradient(${gradient})` : 'var(--h5-line)' }}
        role="img"
        aria-label={`设备总数 ${total} 台，按类型分布`}
      >
        <div>
          <strong>{total}</strong>
          <small>设备总数 / 台</small>
        </div>
      </div>
      <div className="h5-type-legend">
        {items.slice(0, 5).map(row)}
        {items.length > 5 && (
          <Collapse className="h5-type-more">
            <Collapse.Panel key="types" title={`另外 ${items.length - 5} 种类型`}>
              {items.slice(5).map((item, i) => row(item, i + 5))}
            </Collapse.Panel>
          </Collapse>
        )}
      </div>
    </div>
  )
}
