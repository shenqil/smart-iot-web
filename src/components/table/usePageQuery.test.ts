import { describe, expect, it } from 'vitest'
import { sortOrderOf, toSortParam } from './usePageQuery'

describe('排序转换', () => {
  it('toSortParam', () => {
    expect(toSortParam('createdAt', 'descend')).toBe('-createdAt')
    expect(toSortParam('name', 'ascend')).toBe('name')
    expect(toSortParam('name', null)).toBeUndefined()
  })
  it('sortOrderOf 只看第一个字段', () => {
    expect(sortOrderOf('-createdAt,name', 'createdAt')).toBe('descend')
    expect(sortOrderOf('name', 'name')).toBe('ascend')
    expect(sortOrderOf('-createdAt,name', 'name')).toBeNull()
  })
})
