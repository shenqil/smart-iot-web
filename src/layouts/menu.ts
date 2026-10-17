import type { ReactNode } from 'react'

/** 侧边菜单项：path 相对于端的根路径 ('' 为首页) */
export interface PortalMenuItem {
  path: string
  label: string
  icon?: ReactNode
  children?: PortalMenuItem[]
}

/** 根据当前相对路径找出选中的菜单 key 与展开的父级 */
export function matchMenu(items: PortalMenuItem[], relative: string) {
  let best: { key: string; parents: string[] } = { key: '', parents: [] }
  const walk = (list: PortalMenuItem[], parents: string[]) => {
    for (const it of list) {
      if (it.children) walk(it.children, [...parents, it.path])
      else if (relative === it.path || (it.path && relative.startsWith(`${it.path}/`))) {
        if (it.path.length >= best.key.length) best = { key: it.path, parents }
      }
    }
  }
  walk(items, [])
  return best
}
