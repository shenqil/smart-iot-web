import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Button, Layout, Menu, type MenuProps } from 'antd'
import { Suspense } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { Brand } from '@/components/Brand'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { usePref } from '@/stores/pref'
import { Breadcrumbs } from './Breadcrumbs'
import { CompanySwitcher } from './CompanySwitcher'
import { matchMenu, type PortalMenuItem } from './menu'
import { PortalSwitcher } from './PortalSwitcher'
import { UserMenu } from './UserMenu'

interface Props {
  portal: 'admin' | 'tenant'
  basePath: string
  menu: PortalMenuItem[]
}

const toAntdItems = (items: PortalMenuItem[]): MenuProps['items'] =>
  items.map((it) =>
    it.children
      ? { key: `group:${it.path}`, label: it.label, icon: it.icon, children: toAntdItems(it.children) }
      : { key: it.path, label: it.label, icon: it.icon },
  )

/** 管理端外壳：侧边菜单 + 顶栏 (端切换 / 企业切换 / 用户菜单) (FRONTEND_DESIGN §1.2) */
export function AdminLayout({ portal, basePath, menu }: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const collapsed = usePref((s) => s.siderCollapsed)
  const setCollapsed = usePref((s) => s.setSiderCollapsed)

  const relative = location.pathname.slice(basePath.length).replace(/^\/+/, '')
  const { key, parents } = matchMenu(menu, relative)

  return (
    <Layout className="h-full">
      <Layout.Header className="flex items-center gap-4 border-line border-b border-solid">
        <Brand to={basePath} />
        <div className="ml-2">
          <PortalSwitcher current={portal} />
        </div>
        {portal === 'tenant' && <CompanySwitcher portal="tenant" />}
        <div className="ml-auto">
          <UserMenu />
        </div>
      </Layout.Header>
      <Layout>
        <Layout.Sider
          width={208}
          collapsedWidth={56}
          collapsed={collapsed}
          className="border-line border-r border-solid"
          trigger={null}
        >
          <div className="flex h-full flex-col">
            <Menu
              mode="inline"
              className="flex-1 overflow-y-auto border-e-0!"
              selectedKeys={[key]}
              defaultOpenKeys={parents.map((p) => `group:${p}`)}
              items={toAntdItems(menu)}
              onClick={({ key: k }) => navigate(k ? `${basePath}/${k}` : basePath)}
            />
            <Button
              type="text"
              className="m-2"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            >
              {!collapsed && '收起菜单'}
            </Button>
          </div>
        </Layout.Sider>
        <Layout.Content className="page-content overflow-auto p-6">
          <Breadcrumbs />
          <Suspense fallback={<FullPageSpinner />}>
            <Outlet />
          </Suspense>
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
