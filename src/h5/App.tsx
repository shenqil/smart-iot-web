import { QueryClientProvider } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { RouterProvider } from 'react-router'
import { FullPageSpinner } from '@/shared/components/FullPageSpinner'
import { queryClient } from '@/shared/queryClient'
import { SessionWatcher } from '@/shared/SessionWatcher'
import { VersionUpdateDialog } from './components/VersionUpdateDialog'
import MobileProviders from './Providers'
import { router } from './router'

export function App() {
  const state = useSyncExternalStore(
    (listener) => router.subscribe(() => listener()),
    () => router.state,
  )
  return (
    <QueryClientProvider client={queryClient}>
      <MobileProviders>
        <SessionWatcher />
        <VersionUpdateDialog />
        {state.initialized ? <RouterProvider router={router} /> : <FullPageSpinner />}
      </MobileProviders>
    </QueryClientProvider>
  )
}
