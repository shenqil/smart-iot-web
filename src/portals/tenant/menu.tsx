import {
  AppstoreOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  ExportOutlined,
  IdcardOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import type { PortalMenuItem } from '@/layouts/menu'

export const tenantMenu: PortalMenuItem[] = [
  { path: '', label: '概览', icon: <DashboardOutlined /> },
  { path: 'sites', label: '园区管理', icon: <EnvironmentOutlined /> },
  { path: 'devices', label: '设备管理', icon: <AppstoreOutlined /> },
  { path: 'export', label: '数据导出', icon: <ExportOutlined /> },
  { path: 'users', label: '成员管理', icon: <TeamOutlined /> },
  { path: 'company', label: '企业信息', icon: <IdcardOutlined /> },
]
