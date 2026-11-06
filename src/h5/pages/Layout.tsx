import { resetCompanyCache } from '@shared/queryClient'
import { TabBar } from 'antd-mobile'
import { type ReactNode, useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate, useOutlet } from 'react-router'
import { useCompanyId } from '@/hooks/session'
import { Icon, OfflineBanner } from '../ui'
import '../styles/h5.css'

const ROOT_TABS = ['home', 'devices', 'alarms', 'me'] as const
type RootTab = (typeof ROOT_TABS)[number]

export default function MobileLayout() {
  const cid = useCompanyId(),
    location = useLocation(),
    navigate = useNavigate(),
    outlet = useOutlet()

  useEffect(() => {
    resetCompanyCache('app', cid)
  }, [cid])

  const appRef = useRef<HTMLDivElement>(null)
  const page = location.pathname.split('/').at(-1) ?? 'home'
  const isRootTab = ROOT_TABS.includes(page as RootTab) && !new URLSearchParams(location.search).has('deviceId')

  // 保活各 Tab 视图节点 (DOM 与查询常驻)
  const tabsRef = useRef<Partial<Record<RootTab, ReactNode>>>({})
  // 记录各 Tab 的独立滚动高度，切换时无缝还原
  const scrollPositions = useRef<Record<string, number>>({})

  if (isRootTab && outlet) {
    tabsRef.current[page as RootTab] = outlet
  }

  // 监听用户滚动，实时记录当前活跃 Tab 的偏移量
  useEffect(() => {
    if (!isRootTab) return
    const onScroll = () => {
      scrollPositions.current[page] = window.scrollY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isRootTab, page])

  // Tab 切换时在 Paint 前同步还原对应 Tab 的滚动高度，杜绝白屏与二次跳动
  useLayoutEffect(() => {
    if (isRootTab) {
      const targetScroll = scrollPositions.current[page] ?? 0
      window.scrollTo(0, targetScroll)
    }
  }, [isRootTab, page])

  return (
    <div className={`h5-app ${isRootTab ? 'has-tabbar' : ''}`} key={cid} ref={appRef}>
      <OfflineBanner />

      {/* Tab 页面保活渲染区 */}
      {ROOT_TABS.map((tabKey) => {
        const content = tabsRef.current[tabKey]
        if (!content) return null
        return (
          <div
            key={tabKey}
            className="h5-tab-container"
            style={{ display: isRootTab && page === tabKey ? 'contents' : 'none' }}
          >
            {content}
          </div>
        )
      })}

      {/* 二级页面 / 子路由渲染区 */}
      {!isRootTab && <div className="h5-subpage-container">{outlet}</div>}

      {isRootTab && (
        <div className="h5-bottom">
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
