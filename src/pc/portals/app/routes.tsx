import { type RouteObject, redirect } from 'react-router'

export const appRoutes: RouteObject[] = [
  { index: true, loader: ({ request }) => redirect(`monitor${new URL(request.url).search}`) },
  {
    path: 'monitor',
    handle: { crumb: '监测' },
    lazy: async () => ({ Component: (await import('@/features/monitor/MonitorPage')).default }),
  },
  {
    path: 'alarms',
    handle: { crumb: '告警' },
    lazy: async () => ({ Component: (await import('@/features/monitor/AlarmsPage')).default }),
  },
  {
    path: 'operations',
    handle: { crumb: '记录' },
    lazy: async () => ({ Component: (await import('@/features/monitor/OperationsPage')).default }),
  },
  {
    path: 'history',
    handle: { crumb: '历史曲线' },
    lazy: async () => ({ Component: (await import('@/features/monitor/HistoryPage')).default }),
  },
  {
    path: 'comparison',
    handle: { crumb: '日 / 月环比' },
    lazy: async () => ({ Component: (await import('@/features/monitor/ComparisonPage')).default }),
  },
]
