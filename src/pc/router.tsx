import { createBrowserRouter } from 'react-router'
import { RouteError } from '@/pc/components/DesktopRouteError'
import { adminRoutes } from '@/pc/portals/admin/routes'
import { appRoutes } from '@/pc/portals/app/routes'
import { tenantRoutes } from '@/pc/portals/tenant/routes'
import { FullPageSpinner } from '@/shared/components/FullPageSpinner'
import { adminGuard, companyGuard, landingLoader, loginLoader, rootLoader } from '@/shared/guards'
import { registerNavigate } from '@/shared/navigation'

/** PC 桌面端路由总表 (FRONTEND_DESIGN §1.1)：仅包含 PC 端管理、监控与大屏 */
export const router = createBrowserRouter([
  {
    path: '/login',
    loader: loginLoader,
    HydrateFallback: FullPageSpinner,
    lazy: async () => ({ Component: (await import('@/pc/features/auth/LoginPage')).default }),
  },
  {
    path: '/',
    loader: rootLoader,
    HydrateFallback: FullPageSpinner,
    errorElement: <RouteError />,
    children: [
      { index: true, loader: landingLoader },
      {
        path: 'account',
        lazy: async () => ({ Component: (await import('@/pc/features/auth/AccountPage')).default }),
      },
      {
        path: 'no-company',
        lazy: async () => ({ Component: (await import('@/pc/features/auth/NoCompanyPage')).default }),
      },
      {
        path: 'admin',
        loader: adminGuard,
        handle: { crumb: '平台管理' },
        lazy: async () => ({ Component: (await import('@/pc/portals/admin/Layout')).default }),
        children: adminRoutes,
      },
      {
        path: 'tenant/:companyId',
        loader: companyGuard('tenant'),
        handle: { crumb: '企业管理' },
        lazy: async () => ({ Component: (await import('@/pc/portals/tenant/Layout')).default }),
        children: tenantRoutes,
      },
      {
        path: 'app/:companyId',
        loader: companyGuard('app'),
        lazy: async () => ({ Component: (await import('@/pc/layouts/app/AppLayout')).default }),
        children: appRoutes,
      },
      {
        path: 'screen/:companyId',
        loader: companyGuard('app', null),
        lazy: async () => ({ Component: (await import('@/pc/features/screen/ScreenPage')).default }),
      },
      {
        path: '*',
        lazy: async () => ({ Component: (await import('@/pc/features/auth/NotFoundPage')).default }),
      },
    ],
  },
])

registerNavigate((to, opts) => {
  router.navigate(to, opts)
})
