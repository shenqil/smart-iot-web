import { useCallback, useState } from 'react'

/**
 * 时间序翻页。stack[0] 是第一页（无游标），之后每一项是服务端 nextCursor。
 * page 只是本地第几步，不传给后端。
 */
export function useCursorPager(initialSize: number) {
  const [state, setState] = useState({ pageSize: initialSize, stack: [''], index: 0 })

  const reset = useCallback(() => {
    setState((s) => ({ ...s, stack: [''], index: 0 }))
  }, [])

  const setSize = useCallback((pageSize: number) => {
    setState({ pageSize, stack: [''], index: 0 })
  }, [])

  const prev = useCallback(() => {
    setState((s) => ({ ...s, index: Math.max(0, s.index - 1) }))
  }, [])

  const next = useCallback((cursor: string) => {
    setState((s) => {
      const stack = s.stack.slice(0, s.index + 1)
      stack[s.index + 1] = cursor
      return { ...s, stack, index: s.index + 1 }
    })
  }, [])

  const raw = state.stack[state.index] ?? ''
  return {
    cursor: raw || undefined,
    page: state.index + 1,
    pageSize: state.pageSize,
    reset,
    setSize,
    prev,
    next,
  }
}
