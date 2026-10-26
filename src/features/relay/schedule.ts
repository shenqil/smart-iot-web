import type { Schemas } from '@/api/client'
import { BIZ_TZ, dayjs } from '@/lib/time'

/** 定时开关规则 (docs/RELAY_SCHEDULE.md) */
export type RelaySchedule = Schemas['RelayScheduleView']
/** 下一次定时动作 */
export type NextAction = Schemas['RelayNextAction']
type RelayLink = Schemas['RelayLink']

/** 星期选项 (1 = 周一 … 7 = 周日) */
export const WEEKDAY_OPTIONS = ['一', '二', '三', '四', '五', '六', '日'].map((d, i) => ({
  value: i + 1,
  label: `周${d}`,
}))

/** 时段：07:00:00 ~ 19:00:00；跨零点：22:00:00 ~ 次日 06:00:00 */
export const schedulePeriodText = (s: Pick<RelaySchedule, 'start' | 'stop' | 'crossesMidnight'>) =>
  `${s.start} ~ ${s.crossesMidnight ? '次日 ' : ''}${s.stop}`

/** 规则说明：每天 07:00:00 ~ 19:00:00 */
export const scheduleText = (s: Pick<RelaySchedule, 'start' | 'stop' | 'crossesMidnight' | 'weekdayText'>) =>
  `${s.weekdayText} ${schedulePeriodText(s)}`

/** 时刻 (业务时区)：今天 / 明天只写时分秒，其余带日期 */
export function nextAtText(at: string, now = dayjs()) {
  const t = dayjs(at).tz(BIZ_TZ)
  const today = now.tz(BIZ_TZ).startOf('day')
  const days = t.startOf('day').diff(today, 'day')
  const clock = t.format('HH:mm:ss')
  if (days === 0) return `今天 ${clock}`
  if (days === 1) return `明天 ${clock}`
  return t.format('MM-DD HH:mm:ss')
}

/** 下一次动作：明天 07:00:00 开启 */
export const nextActionText = (n: NextAction | null | undefined, now?: ReturnType<typeof dayjs>) =>
  n ? `${nextAtText(n.at, now)} ${n.state ? '开启' : '关闭'}` : ''

/** 自动控制说明：" 2 条告警规则联动、1 组定时"；没有自动控制时为空 */
export function autoControlText(link: Pick<RelayLink, 'linkages' | 'schedules'>) {
  const parts = [
    link.linkages.length ? `${link.linkages.length} 条告警规则联动` : '',
    link.schedules.length ? `${link.schedules.length} 组定时` : '',
  ].filter(Boolean)
  return parts.length ? ` ${parts.join('、')}` : ''
}
