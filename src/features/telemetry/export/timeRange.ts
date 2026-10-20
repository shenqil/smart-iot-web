import { BIZ_TZ, bizNow, dayjs } from '@/lib/time'

type Dayjs = dayjs.Dayjs

/** 自定义时间范围最多 31 天 (已确认决策 #10) */
export const MAX_RANGE_DAYS = 31

/**
 * 时间选择器按浏览器本地时区显示，这里把它当作业务时区的墙上时间：
 * 选择器值 ↔ 业务时区时间 (浏览器时区与业务时区一致时两者相同)
 */
export const pickerToBiz = (d: Dayjs) => dayjs.tz(d.format('YYYY-MM-DD HH:mm:ss'), BIZ_TZ)
export const bizToPicker = (d: Dayjs) => dayjs(d.format('YYYY-MM-DD HH:mm:ss'))

/** 明细默认只保留当月与上月：最早可选上月 1 日 */
export const earliestDate = () => bizNow().subtract(1, 'month').startOf('month')

export type Range = [Dayjs, Dayjs]

/** 快捷范围 (选择器值) */
export function rangePresets(): { label: string; value: Range }[] {
  const now = bizNow()
  const r = (a: Dayjs, b: Dayjs): Range => [bizToPicker(a), bizToPicker(b)]
  const lastMonth = now.subtract(1, 'month')
  return [
    { label: '今天', value: r(now.startOf('day'), now.endOf('day')) },
    { label: '昨天', value: r(now.subtract(1, 'day').startOf('day'), now.subtract(1, 'day').endOf('day')) },
    { label: '最近 24 小时', value: r(now.subtract(24, 'hour'), now) },
    { label: '最近 7 天', value: r(now.subtract(6, 'day').startOf('day'), now.endOf('day')) },
    { label: '本月', value: r(now.startOf('month'), now.endOf('day')) },
    { label: '上月', value: r(lastMonth.startOf('month'), lastMonth.endOf('month')) },
  ]
}

/** 接口参数：开始含、结束不含 → 结束时间 +1 秒，使所选结束秒也包含在内 */
export function toQuery([a, b]: Range) {
  return { start: pickerToBiz(a).format(), end: pickerToBiz(b).add(1, 'second').format() }
}

/** 校验范围，返回错误文案 */
export function rangeError(range: Range | null): string | null {
  if (!range) return '请选择时间范围'
  const [a, b] = range.map(pickerToBiz)
  if (!b.isAfter(a)) return '结束时间必须晚于开始时间'
  if (b.diff(a, 'day', true) > MAX_RANGE_DAYS) return `时间范围最多 ${MAX_RANGE_DAYS} 天`
  if (a.isBefore(earliestDate())) return '明细数据只保留当月与上月'
  return null
}
