import { earliestDate, MAX_RANGE_DAYS } from '@/features/telemetry/export/timeRange'
import { BIZ_TZ, bizNow, dayjs } from '@/lib/time'
export function parseBizTime(value: string) {
  try {
    const parsed = dayjs.tz(value, BIZ_TZ)
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) && parsed.format('YYYY-MM-DDTHH:mm') === value
      ? parsed
      : dayjs(Number.NaN)
  } catch {
    return dayjs(Number.NaN)
  }
}
export function validateRange(start: string, end: string) {
  const a = parseBizTime(start),
    b = parseBizTime(end)
  if (!a.isValid() || !b.isValid() || !b.isAfter(a)) return '结束时间必须晚于开始时间'
  if (b.diff(a, 'day', true) > MAX_RANGE_DAYS) return `时间范围最多 ${MAX_RANGE_DAYS} 天`
  if (a.isBefore(earliestDate())) return '明细只保留当月与上月'
  if (b.isAfter(bizNow().add(1, 'minute'))) return '结束时间不能晚于当前时间'
  return ''
}
export function comparisonDate(value: string | null, month = false) {
  const pattern = month ? /^\d{4}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/
  const now = bizNow().format(month ? 'YYYY-MM' : 'YYYY-MM-DD')
  if (!value || !pattern.test(value) || value > now) return now
  const parsed = dayjs(month ? `${value}-01` : value)
  return parsed.isValid() && parsed.format(month ? 'YYYY-MM' : 'YYYY-MM-DD') === value ? value : now
}
