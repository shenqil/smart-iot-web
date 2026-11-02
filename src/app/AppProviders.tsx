import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, type ReactNode, Suspense } from 'react'
import { isMobilePath } from './navigation'
import { queryClient } from './queryClient'
import '@/lib/time'

const DesktopProviders = lazy(() => import('./DesktopProviders'))
const MobileProviders = lazy(() => import('./MobileProviders'))

/** 公共查询/会话不依赖 UI；两端主题与反馈实现独立按需加载。 */
export function AppProviders({ children, pathname }: { children: ReactNode; pathname: string }) {
  const Provider = isMobilePath(pathname) ? MobileProviders : DesktopProviders
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense
        fallback={
          <div role="status" style={{ padding: 24 }}>
            加载中…
          </div>
        }
      >
        <Provider>{children}</Provider>
      </Suspense>
    </QueryClientProvider>
  )
}
