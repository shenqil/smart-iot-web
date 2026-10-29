import { describe, expect, it } from 'vitest'
import { dailySeries, hourlySeries } from './comparison'

describe('comparison', () => {
  it('整点值按业务时区落位', () => {
    const s = hourlySeries(
      [
        { time: Date.parse('2026-10-19T16:00:05Z'), vals: [1] }, // 上海 00 时
        { time: Date.parse('2026-10-20T05:00:03Z'), vals: [2] }, // 13 时
        { time: Date.parse('2026-10-20T06:00:03Z'), vals: [null] },
      ],
      0,
      'Asia/Shanghai',
    )
    expect(s).toHaveLength(24)
    expect(s[0]).toBe(1)
    expect(s[13]).toBe(2)
    expect(s[14]).toBeNull()
  })
  it('每日值落到当月天数', () => {
    const s = dailySeries(
      [
        { date: '2026-02-01', vals: [5] },
        { date: '2026-02-28', vals: [6] },
      ],
      0,
      '2026-02',
    )
    expect(s).toHaveLength(28)
    expect(s[0]).toBe(5)
    expect(s[27]).toBe(6)
  })
})
