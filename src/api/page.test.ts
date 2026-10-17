import { describe, expect, it, vi } from 'vitest'
import { fetchAllPages } from './page'

describe('fetchAllPages', () => {
  it('取完所有页后停止', async () => {
    const all = Array.from({ length: 450 }, (_, i) => i)
    const fetchPage = vi.fn(async (page: number, size: number) => ({
      records: all.slice((page - 1) * size, page * size),
      totalCount: all.length,
      page,
      pageSize: size,
    }))
    expect(await fetchAllPages(fetchPage)).toHaveLength(450)
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })
  it('records 为 null 时按空处理', async () => {
    expect(await fetchAllPages(async () => ({ records: null, totalCount: 0, page: 1, pageSize: 200 }))).toEqual([])
  })
})
