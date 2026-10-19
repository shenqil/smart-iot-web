/** 后端只接受这几个分辨率 (物理值 = 原始值 × 分辨率)；0 / 未填表示未配置 */
export const RESOLUTIONS = [10, 1, 0.1, 0.01, 0.001] as const
export type Resolution = 0 | (typeof RESOLUTIONS)[number]

export const RESOLUTION_OPTIONS = [
  { value: 0, label: '不填' },
  ...RESOLUTIONS.map((v) => ({ value: v, label: String(v) })),
]

/** 显示小数位：10 / 1 → 0 位，0.1 → 1 位，0.01 → 2 位，0.001 → 3 位，未配置 → 2 位 */
export function decimalsOf(resolution: number | null | undefined): number {
  switch (resolution) {
    case 10:
    case 1:
      return 0
    case 0.1:
      return 1
    case 0.01:
      return 2
    case 0.001:
      return 3
    default:
      return 2
  }
}

/** 传感器"无读数"标记 (该通道无传感器)：实时 / 历史 / 环比数组中的 2147483647，与后端 entity.SensorInvalidValue 一致 */
export const INVALID_READING = 2147483647

/** 是否为有效读数 (画图、统计前过滤) */
export const isValidReading = (v: number | null | undefined): v is number =>
  v != null && !Number.isNaN(v) && v !== INVALID_READING

export function formatValue(value: number | null | undefined, resolution?: number | null): string {
  if (value === INVALID_READING) return '无读数'
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(decimalsOf(resolution))
}
