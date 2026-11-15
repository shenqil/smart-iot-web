import {
  AppstoreOutlined,
  BankOutlined,
  BookOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import type { PortalMenuItem } from '@/layouts/menu'

export const adminMenu: PortalMenuItem[] = [
  { path: '', label: '工作台', icon: <DashboardOutlined /> },
  { path: 'monitoring', label: '系统监控', icon: <CloudServerOutlined /> },
  { path: 'companies', label: '企业管理', icon: <BankOutlined /> },
  { path: 'users', label: '用户管理', icon: <TeamOutlined /> },
  { path: 'devices', label: '设备管理', icon: <AppstoreOutlined /> },
  { path: 'linkages', label: '联动总览', icon: <ThunderboltOutlined /> },
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
  {
    path: 'settings',
    label: '系统设置',
    icon: <SettingOutlined />,
    children: [{ path: 'settings/sys-configs', label: '系统配置' }],
  },
]
