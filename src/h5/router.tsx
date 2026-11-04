import { createBrowserRouter, redirect } from 'react-router'
import { MobileNotFound, MobileRouteError } from '@/h5/components/MobileRouteError'
import { FullPageSpinner } from '@/shared/components/FullPageSpinner'
import { companyGuard, mobileLandingLoader, mobileLoginLoader, rootLoader } from '@/shared/guards'
import { registerNavigate } from '@/shared/navigation'

/** H5 移动端路由总表：仅包含 H5 移动工作台业务页面与身份鉴权 */
export const router = createBrowserRouter([
  {
    path: '/h5/login',
    loader: mobileLoginLoader,
    HydrateFallback: FullPageSpinner,
    lazy: async () => ({ Component: (await import('@/h5/pages/LoginPage')).default }),
  },
  {
    path: '/h5',
    loader: rootLoader,
    HydrateFallback: FullPageSpinner,
    errorElement: <MobileRouteError />,
    children: [
      { index: true, loader: mobileLandingLoader },
      {
        path: 'no-company',
        lazy: async () => ({ Component: (await import('@/h5/pages/NoCompanyPage')).default }),
      },
      {
        path: ':companyId',
        loader: companyGuard('app'),
        lazy: async () => ({ Component: (await import('@/h5/pages/Layout')).default }),
        children: [
          { index: true, loader: () => redirect('home') },
          { path: 'home', lazy: async () => ({ Component: (await import('@/h5/pages/HomePage')).default }) },
          { path: 'sites', lazy: async () => ({ Component: (await import('@/h5/pages/SitesPage')).default }) },
          {
            path: 'sites/:siteId',
            lazy: async () => ({ Component: (await import('@/h5/pages/SitesPage')).default }),
          },
          {
            path: 'devices',
            lazy: async () => ({ Component: (await import('@/h5/pages/DevicesPage')).default }),
          },
          { path: 'alarms', lazy: async () => ({ Component: (await import('@/h5/pages/AlarmsPage')).default }) },
          {
            path: 'alarms/:alarmId',
            lazy: async () => ({ Component: (await import('@/h5/pages/AlarmsPage')).default }),
          },
          {
            path: 'operations',
            lazy: async () => ({ Component: (await import('@/h5/pages/OperationsPage')).default }),
          },
          { path: 'map', lazy: async () => ({ Component: (await import('@/h5/pages/MapPage')).default }) },
          ...['me', 'profile', 'password', 'company-info', 'device-info'].map((path) => ({
            path,
            lazy: async () => ({ Component: (await import('@/h5/pages/AccountPages')).default }),
          })),
          { path: '*', loader: () => redirect('home') },
        ],
      },
      {
        path: '*',
        Component: () => <MobileNotFound onHome={() => router.navigate('/h5')} />,
      },
    ],
  },
  {
    path: '*',
    loader: () => redirect('/h5'),
  },
])

registerNavigate((to, opts) => {
  router.navigate(to, opts)
})
