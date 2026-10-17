import { AppstoreOutlined, BankOutlined, BookOutlined, DashboardOutlined, TeamOutlined } from '@ant-design/icons'
import type { PortalMenuItem } from '@/layouts/menu'

export const adminMenu: PortalMenuItem[] = [
  { path: '', label: '工作台', icon: <DashboardOutlined /> },
  { path: 'companies', label: '企业管理', icon: <BankOutlined /> },
  { path: 'users', label: '用户管理', icon: <TeamOutlined /> },
  { path: 'devices', label: '设备管理', icon: <AppstoreOutlined /> },
  {
    path: 'dicts',
    label: '字典管理',
    icon: <BookOutlined />,
    children: [
      { path: 'dicts/device-types', label: '设备类型' },
      { path: 'dicts/standard-sensors', label: '标准传感器' },
      { path: 'dicts/standard-relays', label: '标准继电器' },
    ],
  },
]
