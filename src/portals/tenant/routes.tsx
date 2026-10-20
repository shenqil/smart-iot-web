import type { RouteObject } from 'react-router'

/** 企业管理端 (FRONTEND_DESIGN §4)：概览 · 园区 · 设备 · 数据导出 · 成员 · 企业信息 */
export const tenantRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => ({ Component: (await import('@/features/company/tenant/TenantOverview')).default }),
  },
  {
    path: 'sites',
    handle: { crumb: '园区管理' },
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('@/features/site/tenant/SiteListPage')).default }),
      },
      {
        path: ':id',
        handle: { crumb: '园区详情' },
        lazy: async () => ({ Component: (await import('@/features/site/tenant/SiteDetailPage')).default }),
      },
    ],
  },
  {
    path: 'devices',
    handle: { crumb: '设备管理' },
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('@/features/device/tenant/DeviceListPage')).default }),
      },
      {
        path: ':id',
        handle: { crumb: '设备配置' },
        lazy: async () => ({ Component: (await import('@/features/device/tenant/DeviceDetailPage')).default }),
      },
    ],
  },
  {
    path: 'export',
    handle: { crumb: '数据导出' },
    lazy: async () => ({ Component: (await import('@/features/telemetry/export/DataExportPage')).default }),
  },
  {
    path: 'users',
    handle: { crumb: '成员管理' },
    lazy: async () => ({ Component: (await import('@/features/user/tenant/MemberListPage')).default }),
  },
  {
    path: 'company',
    handle: { crumb: '企业信息' },
    lazy: async () => ({ Component: (await import('@/features/company/tenant/CompanyInfoPage')).default }),
  },
]
