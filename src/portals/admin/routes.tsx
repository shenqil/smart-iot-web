import type { RouteObject } from 'react-router'

export const adminRoutes: RouteObject[] = [
  { index: true, lazy: async () => ({ Component: (await import('@/features/dashboard/AdminDashboard')).default }) },
  {
    path: 'companies',
    handle: { crumb: '企业管理' },
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('@/features/company/admin/CompanyListPage')).default }),
      },
      {
        path: ':id',
        handle: { crumb: '企业详情' },
        lazy: async () => ({ Component: (await import('@/features/company/admin/CompanyDetailPage')).default }),
      },
    ],
  },
  {
    path: 'users',
    handle: { crumb: '用户管理' },
    children: [
      { index: true, lazy: async () => ({ Component: (await import('@/features/user/admin/UserListPage')).default }) },
      {
        path: ':id',
        handle: { crumb: '用户详情' },
        lazy: async () => ({ Component: (await import('@/features/user/admin/UserDetailPage')).default }),
      },
    ],
  },
  {
    path: 'devices',
    handle: { crumb: '设备管理' },
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('@/features/device/admin/DeviceListPage')).default }),
      },
      {
        path: ':id',
        handle: { crumb: '设备配置' },
        lazy: async () => ({ Component: (await import('@/features/device/admin/DeviceDetailPage')).default }),
      },
    ],
  },
  {
    path: 'dicts',
    handle: { crumb: '字典管理' },
    children: [
      {
        path: 'device-types',
        handle: { crumb: '设备类型' },
        lazy: async () => ({ Component: (await import('@/features/dict/DictPage')).DeviceTypesPage }),
      },
      {
        path: 'standard-sensors',
        handle: { crumb: '标准传感器' },
        lazy: async () => ({ Component: (await import('@/features/dict/DictPage')).StandardSensorsPage }),
      },
      {
        path: 'standard-relays',
        handle: { crumb: '标准继电器' },
        lazy: async () => ({ Component: (await import('@/features/dict/DictPage')).StandardRelaysPage }),
      },
    ],
  },
  {
    path: 'settings',
    handle: { crumb: '系统设置' },
    children: [
      {
        path: 'sys-configs',
        handle: { crumb: '系统配置' },
        lazy: async () => ({ Component: (await import('@/features/sysconfig/SysConfigPage')).default }),
      },
    ],
  },
]
