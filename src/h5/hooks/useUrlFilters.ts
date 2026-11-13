import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/** 列表条件变化回到第一页；时间序翻页只改 cursor。 */
export function useUrlFilters() {
  const [params, setParams] = useSearchParams()
  const patch = useCallback(
    (values: Record<string, string>) =>
      setParams((old) => {
        const next = new URLSearchParams(old)
        next.delete('page')
        next.delete('cursor')
        for (const [k, v] of Object.entries(values)) {
          if (v) next.set(k, v)
          else next.delete(k)
        }
        return next
      }),
    [setParams],
  )
  const goCursor = useCallback(
    (cursor?: string) =>
      setParams((old) => {
        const next = new URLSearchParams(old)
        next.delete('page')
        if (cursor) next.set('cursor', cursor)
        else next.delete('cursor')
        return next
      }),
    [setParams],
  )
  return { params, setParams, patch, goCursor }
}
