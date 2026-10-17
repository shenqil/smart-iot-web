import { createBrowserRouter } from 'react-router'
import { adminGuard, companyGuard, landingLoader, loginLoader, rootLoader } from '@/app/guards'
import { registerNavigate } from '@/app/navigation'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { RouteError } from '@/components/RouteError'
import { adminRoutes } from '@/portals/admin/routes'
import { appRoutes } from '@/portals/app/routes'
import { tenantRoutes } from '@/portals/tenant/routes'

/** 路由总表 (FRONTEND_DESIGN §1.1)：端与企业都在 URL 里，页面按端 lazy 分包 */
export const router = createBrowserRouter([
  {
    path: '/login',
    loader: loginLoader,
    HydrateFallback: FullPageSpinner,
    lazy: async () => ({ Component: (await import('@/features/auth/LoginPage')).default }),
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
        lazy: async () => ({ Component: (await import('@/features/auth/AccountPage')).default }),
      },
      {
        path: 'no-company',
        lazy: async () => ({ Component: (await import('@/features/auth/NoCompanyPage')).default }),
      },
      {
        path: 'admin',
        loader: adminGuard,
        handle: { crumb: '平台管理' },
        lazy: async () => ({ Component: (await import('@/portals/admin/Layout')).default }),
        children: adminRoutes,
      },
      {
        path: 'tenant/:companyId',
        loader: companyGuard('tenant'),
        handle: { crumb: '企业管理' },
        lazy: async () => ({ Component: (await import('@/portals/tenant/Layout')).default }),
        children: tenantRoutes,
      },
      {
        path: 'app/:companyId',
        loader: companyGuard('app'),
        lazy: async () => ({ Component: (await import('@/layouts/app/AppLayout')).default }),
        children: appRoutes,
      },
      {
        path: 'screen/:companyId',
        loader: companyGuard('app', null),
        lazy: async () => ({ Component: (await import('@/features/screen/ScreenPage')).default }),
      },
      {
        path: '*',
        lazy: async () => ({ Component: (await import('@/features/auth/NotFoundPage')).default }),
      },
    ],
  },
])

registerNavigate((to, opts) => {
  router.navigate(to, opts)
})
