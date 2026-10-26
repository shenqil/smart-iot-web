import { describe, expect, it } from 'vitest'
import { dayjs } from '@/lib/time'
import { autoControlText, nextActionText, nextAtText, scheduleText } from './schedule'

describe('schedule text', () => {
  it('formats periods', () => {
    expect(scheduleText({ start: '07:00:00', stop: '19:00:00', crossesMidnight: false, weekdayText: '每天' })).toBe(
      '每天 07:00:00 ~ 19:00:00',
    )
    expect(
      scheduleText({ start: '22:00:00', stop: '06:00:00', crossesMidnight: true, weekdayText: '周一、周五' }),
    ).toBe('周一、周五 22:00:00 ~ 次日 06:00:00')
  })

  it('formats next action relative to business day', () => {
    const now = dayjs('2026-05-26T23:00:00+08:00')
    expect(nextAtText('2026-05-26T23:30:00+08:00', now)).toBe('今天 23:30:00')
    expect(nextAtText('2026-05-26T16:00:00Z', now)).toBe('明天 00:00:00')
    expect(nextAtText('2026-05-29T07:00:00+08:00', now)).toBe('05-29 07:00:00')
    expect(nextActionText({ at: '2026-05-27T07:00:00+08:00', state: 1 }, now)).toBe('明天 07:00:00 开启')
    expect(nextActionText(null)).toBe('')
  })

  it('describes auto control', () => {
    const l = (n: number) => Array.from({ length: n }) as never[]
    expect(autoControlText({ linkages: l(2), schedules: l(1) })).toBe(' 2 条告警规则联动、1 组定时')
    expect(autoControlText({ linkages: [], schedules: l(3) })).toBe(' 3 组定时')
    expect(autoControlText({ linkages: [], schedules: [] })).toBe('')
  })
})
