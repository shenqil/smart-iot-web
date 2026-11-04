import { Breadcrumb } from 'antd'
import { Link, useMatches } from 'react-router'

export interface RouteHandle {
  crumb?: string
}

/** 面包屑：取路由 handle.crumb */
export function Breadcrumbs() {
  const matches = useMatches()
  const crumbs = matches.filter((m) => (m.handle as RouteHandle | undefined)?.crumb)
  if (crumbs.length <= 1) return null
  return (
    <Breadcrumb
      className="mb-4"
      items={crumbs.map((m, i) => ({
        key: m.id,
        title:
          i < crumbs.length - 1 ? (
            <Link to={m.pathname}>{(m.handle as RouteHandle).crumb}</Link>
          ) : (
            (m.handle as RouteHandle).crumb
          ),
      }))}
    />
  )
}
