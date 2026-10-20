import { FullscreenOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SettingOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Drawer, Grid, Layout, Tooltip } from 'antd'
import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { BrandMark } from '@/components/Brand'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { unprocessedAlarmCountQuery } from '@/features/alarm/api'
import { useCompanyId, useCurrentCompany, useMe } from '@/hooks/session'
import { usePref } from '@/stores/pref'
import { CompanySwitcher } from '../CompanySwitcher'
import { UserMenu } from '../UserMenu'
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
  const nav = [
    { to: `${base}/monitor`, label: '监测' },
    { to: `${base}/alarms`, label: '告警', count: alarmCount },
    { to: `${base}/operations`, label: '记录' },
  ]

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
              <Badge count={n.count} size="small" offset={[8, -2]} overflowCount={99}>
                <span className="text-inherit">{n.label}</span>
              </Badge>
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Link to={`/screen/${companyId}${siteId ? `?siteId=${siteId}` : ''}`} target="_blank">
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
        {/* 收起按钮放在不滚动的外层，页面滚动时停在原位 */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          <Tooltip title={collapsed ? '展开园区设备树' : '收起园区设备树'} placement="right">
            <Button
              size="small"
              className="absolute top-4 left-0 z-10 rounded-l-none!"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
          </Tooltip>
          <Layout.Content className="page-content min-h-0 flex-1 overflow-auto py-4 pr-4 pl-10">
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
