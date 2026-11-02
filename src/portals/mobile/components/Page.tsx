import { NavBar, Tabs } from 'antd-mobile'
import { type ReactNode, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useCompanyId, useMe } from '@/hooks/session'

const positions = new Map<string, number>()
const remember = (key: string, value: number) => {
  positions.delete(key)
  positions.set(key, value)
  if (positions.size > 80) positions.delete(positions.keys().next().value ?? '')
}
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
  onScroll?: (el: HTMLElement) => void
  titleClick?: () => void
}) {
  const navigate = useNavigate(),
    location = useLocation(),
    cid = useCompanyId(),
    me = useMe()
  const ref = useRef<HTMLElement>(null),
    content = useRef<HTMLDivElement>(null),
    key = `${me.id}:${cid}:${location.pathname}${location.search}`
  useLayoutEffect(() => {
    const el = ref.current,
      body = content.current
    if (!el || !body) return
    let pending = true,
      last = positions.get(key) ?? 0
    const collapse = () => el.style.setProperty('--collapse', String(Math.min(1, Math.max(0, el.scrollTop / 120))))
    const restore = () => {
      if (!pending) return
      el.scrollTop = last
      collapse()
      if (el.scrollHeight - el.clientHeight >= last) pending = false
    }
    const record = () => {
      if (!pending) last = el.scrollTop
      collapse()
    }
    const takeOver = () => {
      pending = false
      last = el.scrollTop
    }
    restore()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(restore)
    observer?.observe(body)
    el.addEventListener('scroll', record)
    el.addEventListener('wheel', takeOver, { passive: true })
    el.addEventListener('touchstart', takeOver, { passive: true })
    el.addEventListener('keydown', takeOver)
    return () => {
      remember(key, last)
      observer?.disconnect()
      el.removeEventListener('scroll', record)
      el.removeEventListener('wheel', takeOver)
      el.removeEventListener('touchstart', takeOver)
      el.removeEventListener('keydown', takeOver)
    }
  }, [key])
  return (
    <div className="h5-page">
      <header className="h5-chrome">
        <NavBar
          back={back ? undefined : null}
          onBack={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate(`/h5/${cid}/home`))}
          right={right}
        >
          {titleClick ? (
            <button type="button" className="h5-title h5-title-switch" onClick={titleClick}>
              {title}
              <span aria-hidden="true">⌄</span>
            </button>
          ) : (
            <span className="h5-title">{title}</span>
          )}
        </NavBar>
        {!!tabs?.length && (
          <Tabs activeKey={tab} onChange={onTab}>
            {tabs.map((t) => (
              <Tabs.Tab key={t.key} title={t.title} />
            ))}
          </Tabs>
        )}
      </header>
      <main
        className="h5-scroll"
        ref={ref}
        aria-label={typeof title === 'string' ? title : '页面内容'}
        onScroll={(e) => onScroll?.(e.currentTarget)}
      >
        <div className="h5-content" ref={content}>
          {children}
        </div>
      </main>
    </div>
  )
}
