import { moveItem, orderedChecked, reconcileSelection } from './channelSelection'

const sensors = [{ channelNum: 2 }, { channelNum: 0 }, { channelNum: 1 }]

describe('channelSelection', () => {
  it('移动项', () => {
    expect(moveItem([0, 1, 2, 3], 0, 2)).toEqual([1, 2, 0, 3])
    expect(moveItem([0, 1, 2, 3], 3, 0)).toEqual([3, 0, 1, 2])
  })
  it('默认按通道号排序且全选', () => {
    expect(reconcileSelection(null, sensors)).toEqual({ order: [0, 1, 2], checked: [0, 1, 2] })
  })
  it('恢复上次选择：去掉已删除的通道，新增通道追加并勾选', () => {
    const r = reconcileSelection({ order: [2, 9, 0], checked: [9, 0] }, sensors)
    expect(r).toEqual({ order: [2, 0, 1], checked: [0, 1] })
  })
  it('按排列顺序输出勾选的通道', () => {
    expect(orderedChecked({ order: [2, 0, 1], checked: [1, 2] })).toEqual([2, 1])
  })
})
