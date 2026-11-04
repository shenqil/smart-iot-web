import type { SensorConfig } from '../lib/exportData'

/** 通道选择：order 为全部已配置通道的排列 (导出列顺序)，checked 为勾选的通道 */
export interface ChannelSelection {
  order: number[]
  checked: number[]
}

/** 数组中移动一项 */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= arr.length) return arr
  const next = [...arr]
  const [it] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(to, next.length)), 0, it)
  return next
}

/** 默认：按通道号排序、全选 */
export const defaultSelection = (sensors: SensorConfig[]): ChannelSelection => {
  const order = sensors.map((s) => s.channel).sort((a, b) => a - b)
  return { order, checked: order }
}

/**
 * 恢复上次的选择，并与当前配置对齐：已删除的通道去掉，新增的通道追加到末尾 (默认勾选)
 */
export function reconcileSelection(saved: ChannelSelection | null, sensors: SensorConfig[]): ChannelSelection {
  const def = defaultSelection(sensors)
  if (!saved) return def
  const exist = new Set(def.order)
  const order = saved.order.filter((n) => exist.has(n))
  const added = def.order.filter((n) => !order.includes(n))
  const checked = saved.checked.filter((n) => exist.has(n))
  return { order: [...order, ...added], checked: [...checked, ...added] }
}

/** 导出列：按排列顺序取勾选的通道 */
export const orderedChecked = (s: ChannelSelection) => {
  const set = new Set(s.checked)
  return s.order.filter((n) => set.has(n))
}

const storeKey = (cid: number, deviceId: number) => `siot.export.${cid}.${deviceId}`

/** 每台设备记住上次的通道选择 (仅本机便利，读写失败忽略) */
export function loadSelection(cid: number, deviceId: number): ChannelSelection | null {
  try {
    const v = JSON.parse(localStorage.getItem(storeKey(cid, deviceId)) ?? 'null')
    return v && Array.isArray(v.order) && Array.isArray(v.checked) ? v : null
  } catch {
    return null
  }
}

export function saveSelection(cid: number, deviceId: number, s: ChannelSelection) {
  try {
    localStorage.setItem(storeKey(cid, deviceId), JSON.stringify(s))
  } catch {
    // 隐私模式等不可用时忽略
  }
}
