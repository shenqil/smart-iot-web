import { Button, Dialog, ErrorBlock, NavBar, Picker, Popup, Skeleton, Tabs, Toast } from 'antd-mobile'
import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { errorText } from '@/api/errors'
import { useCompanyId, useMe } from '@/hooks/session'

export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7v10H3Z" />
        <path d="M9 20v-7h6v7" />
      </>
    ),
    devices: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    alarms: (
      <>
        <path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5Z" />
        <path d="M10 21h4" />
      </>
    ),
    me: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    sensor: (
      <>
        <path d="M4 12h4l2-7 4 14 2-7h4" />
        <rect x="2" y="2" width="20" height="20" rx="5" />
      </>
    ),
    relay: (
      <>
        <rect x="2" y="7" width="20" height="10" rx="5" />
        <circle cx="8" cy="12" r="3" />
      </>
    ),
    camera: (
      <>
        <rect x="2" y="6" width="14" height="12" rx="3" />
        <path d="m16 10 6-4v12l-6-4Z" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18M7 15l4-6 4 3 5-8" />
      </>
    ),
    map: (
      <>
        <path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16m6-14v16" />
      </>
    ),
    filter: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="8" cy="6" r="2" />
        <circle cx="16" cy="12" r="2" />
        <circle cx="10" cy="18" r="2" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.devices}
    </svg>
  )
}
const positions = new Map<string, number>()
export function Page({
  title,
  children,
  tabs,
  tab,
  onTab,
  back = true,
  right,
  onScroll,
  titleClick,
}: {
  title: ReactNode
  children: ReactNode
  tabs?: { key: string; title: string }[]
  tab?: string
  onTab?: (v: string) => void
  back?: boolean
  right?: ReactNode
  onScroll?: (el: HTMLDivElement) => void
  titleClick?: () => void
}) {
  const navigate = useNavigate(),
    location = useLocation(),
    cid = useCompanyId(),
    me = useMe()
  const ref = useRef<HTMLDivElement>(null),
    scrollKey = `${me.id}:${cid}:${location.pathname}${location.search}`
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTop = positions.get(scrollKey) ?? 0
    el.style.setProperty('--collapse', String(Math.min(1, Math.max(0, el.scrollTop / 120))))
    return () => {
      positions.set(scrollKey, el.scrollTop)
    }
  }, [scrollKey])
  return (
    <div className="h5-page">
      <div className="h5-chrome">
        <NavBar
          back={back ? undefined : null}
          onBack={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate(`/h5/${cid}/home`))}
          right={right}
        >
          <button type="button" className="h5-title" onClick={titleClick} disabled={!titleClick}>
            {title}
          </button>
        </NavBar>
        {tabs && (
          <Tabs activeKey={tab} onChange={onTab}>
            {tabs.map((t) => (
              <Tabs.Tab title={t.title} key={t.key} />
            ))}
          </Tabs>
        )}
      </div>
      <div
        className="h5-scroll"
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget
          el.style.setProperty('--collapse', String(Math.min(1, Math.max(0, el.scrollTop / 120))))
          onScroll?.(el)
        }}
      >
        {children}
      </div>
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
    <section className={`h5-card ${className}`}>
      {(title || extra) && (
        <div className="h5-section-head">
          <h2>{title}</h2>
          {extra}
        </div>
      )}
      {children}
    </section>
  )
}
export function Loading() {
  return (
    <div className="h5-card" role="status" aria-label="加载中">
      <Skeleton.Title animated />
      <Skeleton.Paragraph animated lineCount={3} />
    </div>
  )
}
export function Failure({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className="h5-card">
      <ErrorBlock status="disconnected" title="暂时无法加载" description={errorText(error)} />
      {retry && (
        <Button block onClick={retry}>
          重试
        </Button>
      )}
    </div>
  )
}
export function Empty({ title = '暂无数据', children }: { title?: string; children?: ReactNode }) {
  return (
    <div className="h5-empty">
      <ErrorBlock status="empty" title={title} description={children ?? ''} />
    </div>
  )
}
export function Sheet({
  title,
  visible,
  close,
  children,
}: {
  title: string
  visible: boolean
  close: () => void
  children: ReactNode
}) {
  return (
    <Popup
      getContainer={() => document.querySelector<HTMLElement>('.mobile-root') ?? document.body}
      visible={visible}
      onMaskClick={close}
      showCloseButton
      onClose={close}
      destroyOnClose
      bodyClassName="h5-sheet"
    >
      <h2>{title}</h2>
      {children}
    </Popup>
  )
}
export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value?: string
  options: { label: string; value: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button block fill="outline" onClick={() => setOpen(true)}>
        {label}：{options.find((o) => o.value === (value ?? ''))?.label ?? '请选择'}
      </Button>
      <Picker
        getContainer={mobileContainer}
        title={label}
        visible={open}
        onClose={() => setOpen(false)}
        columns={[options]}
        value={[value ?? '']}
        onConfirm={(v) => onChange(String(v[0] ?? ''))}
      />
    </>
  )
}
export function useVisible() {
  const [visible, setVisible] = useState(() => !document.hidden)
  useEffect(() => {
    const fn = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', fn)
    return () => document.removeEventListener('visibilitychange', fn)
  }, [])
  return visible
}
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
export const showFailure = (e: unknown) =>
  Toast.show({ getContainer: mobileContainer, content: errorText(e), icon: 'fail' })

export const mobileContainer = () => document.querySelector<HTMLElement>('.mobile-root') ?? document.body
export const mobileToast = {
  show: (props: Parameters<typeof Toast.show>[0]) =>
    Toast.show({ ...(typeof props === 'string' ? { content: props } : props), getContainer: mobileContainer }),
}
export const mobileDialog = {
  confirm: (props: Parameters<typeof Dialog.confirm>[0]) => Dialog.confirm({ ...props, getContainer: mobileContainer }),
}
