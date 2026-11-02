import { useSyncExternalStore } from 'react'
import { RouterProvider } from 'react-router'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { router } from '@/router'
import { AppProviders } from './AppProviders'
import { SessionWatcher } from './SessionWatcher'

/** Provider 懒加载可能晚于路由初始化；初次完成后才挂载 RouterProvider，避免丢失加载完成通知。 */
export function Application() {
  const state = useSyncExternalStore(
    (listener) => router.subscribe(() => listener()),
    () => router.state,
  )
  return (
    <AppProviders pathname={state.location.pathname}>
      <SessionWatcher />
      {state.initialized ? <RouterProvider router={router} /> : <FullPageSpinner />}
    </AppProviders>
  )
}
