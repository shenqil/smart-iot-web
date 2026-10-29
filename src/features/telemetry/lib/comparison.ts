import { isValidReading } from '@/lib/resolution'
import { BIZ_TZ, dayjs } from '@/lib/time'

/**
 * 日环比：整点值 (每小时收到的第一帧) 按业务时区落到 0~23 时；缺失为 null (折线断开)
 */
export function hourlySeries(
  records: { time: number; vals: readonly (number | null)[] }[] | null | undefined,
  channel: number,
  tz = BIZ_TZ,
): (number | null)[] {
  const out: (number | null)[] = Array(24).fill(null)
  for (const r of records ?? []) {
    const v = r.vals?.[channel]
    if (isValidReading(v)) out[dayjs(r.time).tz(tz).hour()] = v
  }
  return out
}

/** 月环比：每日值 (每天 12:00 起收到的第一帧) 落到 1~当月天数 (下标 0 = 1 日) */
export function dailySeries(
  records: { date: string; vals: readonly (number | null)[] }[] | null | undefined,
  channel: number,
  month: string,
): (number | null)[] {
  const days = dayjs(`${month}-01`).daysInMonth()
  const out: (number | null)[] = Array(days).fill(null)
  for (const r of records ?? []) {
    if (!r.date.startsWith(month)) continue
    const d = Number(r.date.slice(8, 10))
    const v = r.vals?.[channel]
    if (d >= 1 && d <= days && isValidReading(v)) out[d - 1] = v
  }
  return out
}
