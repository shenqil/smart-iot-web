import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useCursorPager } from './useCursorPager'

describe('useCursorPager', () => {
  it('下一页使用服务端游标，上一页回到上一位置，改每页条数回到第一页', () => {
    const { result } = renderHook(() => useCursorPager(20))
    expect(result.current.cursor).toBeUndefined()
    expect(result.current.page).toBe(1)

    act(() => result.current.next('100.1'))
    expect(result.current.page).toBe(2)
    expect(result.current.cursor).toBe('100.1')

    act(() => result.current.next('90.2'))
    act(() => result.current.prev())
    expect(result.current.cursor).toBe('100.1')

    act(() => result.current.setSize(50))
    expect(result.current.page).toBe(1)
    expect(result.current.cursor).toBeUndefined()
    expect(result.current.pageSize).toBe(50)
  })
})
