import { nextSiteIds } from './api'

describe('nextSiteIds', () => {
  it('新增时与现有集合合并去重', () => {
    expect(nextSiteIds([1, 2], [2, 3])).toEqual([1, 2, 3])
  })
  it('移除指定园区', () => {
    expect(nextSiteIds([1, 2, 3], [], [2])).toEqual([1, 3])
  })
  it('全部移除得到空集合', () => {
    expect(nextSiteIds([1], [], [1])).toEqual([])
  })
})
