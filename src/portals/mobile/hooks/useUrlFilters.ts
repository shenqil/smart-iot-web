import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/** 列表条件变化回到第一页；翻页保留当前企业/园区/设备条件。 */
export function useUrlFilters() {
  const [params, setParams] = useSearchParams()
  const patch = useCallback(
    (values: Record<string, string>) =>
      setParams((old) => {
        const next = new URLSearchParams(old)
        next.delete('page')
        for (const [k, v] of Object.entries(values)) {
          if (v) next.set(k, v)
          else next.delete(k)
        }
        return next
      }),
    [setParams],
  )
  const goPage = useCallback(
    (page: number) =>
      setParams((old) => {
        const next = new URLSearchParams(old)
        if (page > 1) next.set('page', String(page))
        else next.delete('page')
        return next
      }),
    [setParams],
  )
  return { params, setParams, patch, goPage }
}
