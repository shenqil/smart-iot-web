import { SERIES_COLORS } from '@/hooks/useECharts'
import type { AppSensor } from './realtime'

const unitOf = (s: Pick<AppSensor, 'unit'>) => s.unit?.trim() ?? ''

/**
 * 通道颜色：同一单位的通道画在同一张图里，按通道在该单位中的顺序取分类色
 * 颜色跟随通道 (不随勾选变化)，同一张图内不重复 (每种单位最多 8 个通道)
 */
export function channelColor(sensors: AppSensor[], channelNum: number): string {
  const s = sensors.find((x) => x.channelNum === channelNum)
  if (!s) return SERIES_COLORS[0]
  const same = sensors.filter((x) => unitOf(x) === unitOf(s)).sort((a, b) => a.channelNum - b.channelNum)
  return SERIES_COLORS[
    Math.max(
      0,
      same.findIndex((x) => x.channelNum === channelNum),
    ) % SERIES_COLORS.length
  ]
}

/** 按单位分组 (保持通道顺序)：一组一张图，避免双 Y 轴 */
export function groupByUnit(sensors: AppSensor[]): { unit: string; sensors: AppSensor[] }[] {
  const groups = new Map<string, AppSensor[]>()
  for (const s of sensors) {
    const u = unitOf(s)
    groups.set(u, [...(groups.get(u) ?? []), s])
  }
  return [...groups].map(([unit, list]) => ({ unit, sensors: list }))
}
