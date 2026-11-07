import { FullscreenOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SettingOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Drawer, Grid, Layout, Tooltip } from 'antd'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { BrandMark } from '@/components/Brand'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { unprocessedAlarmCountQuery } from '@/features/alarm/api'
import { appSiteDevicesQuery } from '@/features/device/api'
import { useDeviceTypes } from '@/features/dict/api'
import { isVideoDeviceType } from '@/features/telemetry/lib/realtime'
import { useCompanyId, useCurrentCompany, useMe } from '@/hooks/session'
import { usePref } from '@/stores/pref'
import { CompanySwitcher } from '../CompanySwitcher'
import { UserMenu } from '../UserMenu'
import { ScopeHeader } from './ScopeHeader'
import { ScopeTree } from './ScopeTree'
import { useScope } from './useScope'

/**
 * 按企业 ID 重新挂载外壳：切换企业时设备树的展开项、搜索词、筛选与工作区内的状态全部清空，
 * 不会用上一个企业的园区 ID 去请求新企业 (FRONTEND_DESIGN §5.0)
 */
export function AppPortal() {
  const companyId = useCompanyId()
  return <AppLayout key={companyId} />
}

/** 数据端外壳：顶部导航 + 园区设备树 + 工作区 (FRONTEND_DESIGN §5.0) */
export function AppLayout() {
  const companyId = useCompanyId()
  const company = useCurrentCompany()
  const me = useMe()
  const { siteId, deviceId, scopeSearch } = useScope()
  const treeCollapsed = usePref((s) => s.scopeTreeCollapsed)
  const setTreeCollapsed = usePref((s) => s.setScopeTreeCollapsed)
  // 窄屏 (< 992px，平板现场巡检)：设备树改为抽屉，选中后自动收起 (FRONTEND_DESIGN §5.2.1)
  const narrow = Grid.useBreakpoint().lg === false
  const [drawerOpen, setDrawerOpen] = useState(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 范围变化时收起抽屉
  useEffect(() => setDrawerOpen(false), [siteId, deviceId])
  const collapsed = narrow ? !drawerOpen : treeCollapsed
  const setCollapsed = (v: boolean) => (narrow ? setDrawerOpen(!v) : setTreeCollapsed(v))
  const { data: alarmCount } = useQuery(unprocessedAlarmCountQuery(companyId))

  const base = `/app/${companyId}`
  const manageTo = company?.manageable ? `/tenant/${companyId}` : me.systemRole === 'admin' ? '/admin' : null
  const navigate = useNavigate()
  const location = useLocation()
  const types = useDeviceTypes()
  const devices = useQuery({
    ...appSiteDevicesQuery(companyId, siteId ?? 0),
    enabled: Boolean(siteId && deviceId),
  })
  const currentDevice = devices.data?.find((d) => d.id === deviceId)
  const isVideo = isVideoDeviceType(
    currentDevice?.deviceTypeId != null ? types.byId.get(currentDevice.deviceTypeId)?.name : undefined,
  )
  const isDevice = Boolean(deviceId)

  const allNav = [
    { key: 'monitor', to: `${base}/monitor`, label: '监测' },
    { key: 'alarms', to: `${base}/alarms`, label: '告警', count: alarmCount },
    { key: 'operations', to: `${base}/operations`, label: '记录' },
    { key: 'history', to: `${base}/history`, label: '历史曲线' },
    { key: 'comparison', to: `${base}/comparison`, label: '日 / 月环比' },
  ]

  const nav = allNav.filter((n) => {
    // 监控设备：只展示 [监测]
    if (isDevice && isVideo) return n.key === 'monitor'
    // 园区或企业：只展示 [监测] , [告警] , [记录]
    if (!isDevice) return n.key === 'monitor' || n.key === 'alarms' || n.key === 'operations'
    // 普通设备：展示 [监测] , [告警] , [记录] , 历史曲线, 日 / 月环比
    return true
  })

  // 计算当前作用域允许访问的 tab 集合
  const allowedTabs = useMemo(() => {
    if (isDevice && isVideo) return ['monitor']
    if (!isDevice) return ['monitor', 'alarms', 'operations']
    return ['monitor', 'alarms', 'operations', 'history', 'comparison']
  }, [isDevice, isVideo])

  // 当前所处的 tab (根据 URL 路径末尾判断)
  const pathParts = location.pathname.split('/').filter(Boolean)
  const currentTab = pathParts[pathParts.length - 1] || 'monitor'

  // 如果切换到新的设备或园区后没有对应 tab，自动切换到 [监测] tab
  useLayoutEffect(() => {
    // 若选择了设备且设备列表仍在加载，等待加载完成判定设备类型后再决定是否重定向
    if (isDevice && devices.isPending) return

    if (!allowedTabs.includes(currentTab)) {
      navigate({ pathname: `${base}/monitor`, search: location.search }, { replace: true })
    }
  }, [allowedTabs, currentTab, isDevice, devices.isPending, base, location.search, navigate])

  const contentRef = useRef<HTMLElement>(null)
  const [heroVisible, setHeroVisible] = useState(true)

  // 切换设备、园区或页面时，内容区域滚动条回到顶部，并重置 hero 卡片可见状态
  // biome-ignore lint/correctness/useExhaustiveDependencies: 切换设备、园区或页面时重置滚动位置与状态
  useLayoutEffect(() => {
    const el = contentRef.current
    if (el) {
      el.scrollTop = 0
    }
    window.scrollTo(0, 0)
    setHeroVisible(true)
    const id = requestAnimationFrame(() => {
      if (contentRef.current) {
        contentRef.current.scrollTop = 0
      }
    })
    return () => cancelAnimationFrame(id)
  }, [deviceId, siteId, location.pathname])

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const hero = document.getElementById('device-hero')
    if (hero) {
      const heroRect = hero.getBoundingClientRect()
      const containerRect = e.currentTarget.getBoundingClientRect()
      // 当设备信息卡片底部滚出容器顶部时判定为已消失
      setHeroVisible(heroRect.bottom > containerRect.top)
    } else {
      setHeroVisible(true)
    }
  }

  return (
    <Layout className="h-full">
      <Layout.Header className="flex items-center gap-2 border-line border-b border-solid">
        <Link to={`${base}/monitor`} className="flex text-primary">
          <BrandMark />
        </Link>
        <CompanySwitcher portal="app" variant="borderless" />
        <nav className="ml-4 flex h-full items-stretch gap-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={{ pathname: n.to, search: scopeSearch() }}
              className={({ isActive }) =>
                `flex items-center border-0 border-b-2 border-solid px-4 text-[15px] no-underline transition-colors ${
                  isActive ? 'border-primary font-medium text-primary' : 'border-transparent text-fg hover:text-primary'
                }`
              }
            >
              {n.count != null ? (
                <Badge count={n.count} size="small" offset={[8, -2]} overflowCount={99}>
                  <span className="text-inherit">{n.label}</span>
                </Badge>
              ) : (
                <span className="text-inherit">{n.label}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Link to={`/screen/${companyId}${scopeSearch()}`} target="_blank">
            <Button type="text" icon={<FullscreenOutlined />}>
              大屏
            </Button>
          </Link>
          {manageTo && (
            <Link to={manageTo}>
              <Button type="text" icon={<SettingOutlined />}>
                管理后台
              </Button>
            </Link>
          )}
          <UserMenu />
        </div>
      </Layout.Header>
      <Layout>
        {narrow ? (
          <Drawer
            open={drawerOpen}
            placement="left"
            size={300}
            title="园区设备"
            onClose={() => setDrawerOpen(false)}
            styles={{ body: { padding: 0 } }}
          >
            <ScopeTree />
          </Drawer>
        ) : (
          <Layout.Sider
            width={260}
            collapsedWidth={0}
            collapsed={collapsed}
            trigger={null}
            className="border-line border-r border-solid"
          >
            <ScopeTree />
          </Layout.Sider>
        )}
        {/* 顶部固定条：折叠按钮 + ScopeHeader (面包屑 + 滚动时右侧浮现简要信息) */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative z-10 flex min-h-[46px] shrink-0 items-center justify-between border-line border-b border-solid bg-container py-2.5 pr-4 pl-10">
            <Tooltip title={collapsed ? '展开园区设备树' : '收起园区设备树'} placement="right">
              <Button
                size="small"
                className="absolute top-2.5 left-0 z-10 rounded-l-none!"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
              />
            </Tooltip>
            <ScopeHeader
              heroVisible={heroVisible}
              onScrollToTop={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            />
          </div>
          <Layout.Content
            ref={contentRef}
            onScroll={handleScroll}
            className="page-content min-h-0 flex-1 overflow-auto py-4 pr-4 pl-10"
          >
            <Suspense fallback={<FullPageSpinner />}>
              <Outlet />
            </Suspense>
          </Layout.Content>
        </div>
      </Layout>
    </Layout>
  )
}

export default AppPortal
