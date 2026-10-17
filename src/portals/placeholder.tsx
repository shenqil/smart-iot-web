import type { RouteObject } from 'react-router'
import { PagePlaceholder } from '@/components/PagePlaceholder'

/** 骨架阶段的占位路由 */
export function placeholderRoute(path: string, crumb: string, milestone: string, items: string[]): RouteObject {
  return {
    path,
    handle: { crumb },
    Component: () => <PagePlaceholder title={crumb} milestone={milestone} items={items} />,
  }
}
