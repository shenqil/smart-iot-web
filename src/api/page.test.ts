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

it('超过上限必须报错，不能把部分数据当全部', async () => {
  await expect(
    fetchAllPages(
      async (page, pageSize) => ({
        records: Array.from({ length: 200 }, (_, i) => i),
        totalCount: 1000,
        page,
        pageSize,
      }),
      2,
    ),
  ).rejects.toThrow('上限')
})
it('统计仍有数据但返回空页时报告变化', async () => {
  await expect(
    fetchAllPages(async (page, pageSize) => ({ records: [], totalCount: 1, page, pageSize })),
  ).rejects.toThrow('变化')
})
