import { Button, ErrorBlock, Card as MobileCard, NoticeBar, Skeleton, Tag } from 'antd-mobile'
import type { ReactNode } from 'react'
import { errorText } from '@/api/errors'

export function SectionHeading({ title, extra }: { title: ReactNode; extra?: ReactNode }) {
  return (
    <div className="h5-section-head">
      <h2>{title}</h2>
      {extra}
    </div>
  )
}
export function Card({
  title,
  extra,
  children,
  className = '',
}: {
  title?: ReactNode
  extra?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <MobileCard
      className={`h5-card ${className}`}
      title={title ? <h2>{title}</h2> : undefined}
      extra={extra}
      headerClassName="h5-card-header"
      bodyClassName="h5-card-body"
    >
      {children}
    </MobileCard>
  )
}
export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'
export function StatusTag({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <Tag className={`h5-status h5-status-${tone}`} fill="outline">
      {children}
    </Tag>
  )
}
export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode
  tone?: 'info' | 'warning' | 'danger' | 'success'
}) {
  return (
    <NoticeBar
      className="h5-message"
      color={tone === 'warning' ? 'alert' : tone === 'danger' ? 'error' : tone}
      content={children}
      wrap
      shape="rounded"
    />
  )
}
export function Loading() {
  return (
    <div className="h5-loading" role="status" aria-label="加载中">
      <Skeleton.Title animated />
      <Skeleton.Paragraph animated lineCount={3} />
    </div>
  )
}
export function Failure({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className="h5-state" role="alert">
      <ErrorBlock status="disconnected" title="暂时无法加载" description={errorText(error)} />
      {retry && (
        <Button size="small" fill="outline" color="primary" onClick={retry}>
          重新加载
        </Button>
      )}
    </div>
  )
}
export function Empty({ title = '暂无数据', children }: { title?: string; children?: ReactNode }) {
  return (
    <div className="h5-state h5-empty">
      <ErrorBlock status="empty" title={title} description={children ?? '数据更新后会在这里展示'} />
    </div>
  )
}
export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="h5-dl">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
export function Pagination({
  page,
  hasMore,
  busy,
  canPrev = page > 1,
  onPrev,
  onNext,
}: {
  page: number
  hasMore: boolean
  busy: boolean
  canPrev?: boolean
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <nav className="h5-pagination" aria-label="列表分页">
      <Button fill="outline" size="small" disabled={!canPrev || busy} onClick={onPrev}>
        上一页
      </Button>
      <span>
        第 <b>{page}</b> 页
      </span>
      <Button fill="outline" size="small" disabled={!hasMore || busy} onClick={onNext}>
        下一页
      </Button>
    </nav>
  )
}
