import { StrictMode, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { AppProviders } from '@/app/AppProviders'
import { SessionWatcher } from '@/app/SessionWatcher'
import { router } from '@/router'
import './index.css'

if (import.meta.env.VITE_APP_TITLE) document.title = import.meta.env.VITE_APP_TITLE

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

function Application() {
  const pathname = useSyncExternalStore(
    (listener) => router.subscribe(() => listener()),
    () => router.state.location.pathname,
  )
  return (
    <AppProviders pathname={pathname}>
      <SessionWatcher />
      <RouterProvider router={router} />
    </AppProviders>
  )
}

createRoot(root).render(
  <StrictMode>
    <Application />
  </StrictMode>,
)
