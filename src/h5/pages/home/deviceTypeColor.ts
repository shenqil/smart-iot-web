const palette = ['#147d64', '#63aa8a', '#5e91b8', '#b4a66a', '#8e8db7', '#d09b79', '#7eaaa8']
const unclassified = '#a5b6a9'

/** 按类型 id 取色。排序变化不会改颜色；未分类固定为最后一档灰绿。 */
export function deviceTypeColor(deviceTypeId: number | null) {
  if (deviceTypeId == null) return unclassified
  return palette[Math.abs(deviceTypeId) % palette.length] ?? unclassified
}
