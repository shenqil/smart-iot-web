import { lazy, Suspense } from 'react'
import { useLocation } from 'react-router'
import { isMobilePath } from '@/app/navigation'
import { FullPageSpinner } from './FullPageSpinner'

const DesktopError = lazy(() => import('./DesktopRouteError').then((m) => ({ default: m.RouteError })))
const DesktopNotFound = lazy(() => import('./DesktopRouteError').then((m) => ({ default: m.NotFoundResult })))
const MobileError = lazy(() => import('./MobileRouteError').then((m) => ({ default: m.MobileRouteError })))
const MobileNotFound = lazy(() => import('./MobileRouteError').then((m) => ({ default: m.MobileNotFound })))

export function RouteError() {
  const Component = isMobilePath(useLocation().pathname) ? MobileError : DesktopError
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Component />
    </Suspense>
  )
}
export function NotFoundResult({ onHome }: { onHome: () => void }) {
  const Component = isMobilePath(useLocation().pathname) ? MobileNotFound : DesktopNotFound
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Component onHome={onHome} />
    </Suspense>
  )
}
