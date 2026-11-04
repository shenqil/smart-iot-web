import { resetCompanyCache } from '@shared/queryClient'
import { TabBar } from 'antd-mobile'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { useCompanyId } from '@/hooks/session'
import { Icon } from '../ui'
import '../styles/h5.css'

export default function MobileLayout() {
  const cid = useCompanyId(),
    location = useLocation(),
    navigate = useNavigate()
  useEffect(() => {
    resetCompanyCache('app', cid)
  }, [cid])
  const appRef = useRef<HTMLDivElement>(null),
    bottomRef = useRef<HTMLDivElement>(null)
  const page = location.pathname.split('/').at(-1) ?? 'home'
  const root =
    ['home', 'devices', 'alarms', 'me'].includes(page) && !new URLSearchParams(location.search).has('deviceId')
  // biome-ignore lint/correctness/useExhaustiveDependencies: root and company changes replace the measured navigation element
  useLayoutEffect(() => {
    const el = bottomRef.current,
      app = appRef.current
    if (!el || !app) {
      document.documentElement.style.setProperty('--h5-bottom-height', '0px')
      app?.style.setProperty('--h5-bottom-height', '0px')
      return
    }
    const measure = () => {
      const h = `${el.getBoundingClientRect().height}px`
      app.style.setProperty('--h5-bottom-height', h)
      document.documentElement.style.setProperty('--h5-bottom-height', h)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      observer.disconnect()
      document.documentElement.style.setProperty('--h5-bottom-height', '0px')
      app.style.setProperty('--h5-bottom-height', '0px')
    }
  }, [root, cid])
  return (
    <div className="h5-app" key={cid} ref={appRef}>
      <Outlet />
      {root && (
        <div className="h5-bottom" ref={bottomRef}>
          <TabBar activeKey={page} onChange={(p) => navigate(`/h5/${cid}/${p}`)}>
            {[
              ['home', '首页'],
              ['devices', '设备'],
              ['alarms', '告警'],
              ['me', '我的'],
            ].map(([key, title]) => (
              <TabBar.Item key={key} title={title} icon={<Icon name={key} />} />
            ))}
          </TabBar>
        </div>
      )}
    </div>
  )
}
