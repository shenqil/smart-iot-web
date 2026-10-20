import { describe, expect, it } from 'vitest'
import { INVALID_READING } from '@/lib/resolution'
import { csvLines, toColumnar, wallTime } from './series'

const records = [
  { time: Date.parse('2026-10-20T00:00:00Z'), vals: [1.234, INVALID_READING] },
  { time: Date.parse('2026-10-20T00:00:10Z'), vals: [2.5, 3] },
]

describe('series', () => {
  it('列式存储，无读数为 NaN', () => {
    const h = toColumnar(records, [0, 1])
    expect(Array.from(h.times)).toEqual(records.map((r) => r.time))
    expect(Number.isNaN(h.channels.get(1)?.[0])).toBe(true)
    expect(h.channels.get(0)?.[1]).toBe(2.5)
  })
  it('业务时区墙上时间', () => {
    expect(wallTime(Date.parse('2026-10-20T00:00:10Z'), 480)).toBe('2026-10-20 08:00:10')
  })
  it('CSV：表头转义、按小数位、空值', () => {
    const h = toColumnar(records, [0, 1])
    const lines = [
      ...csvLines(
        h,
        [
          { channelNum: 0, header: '温度 (℃)', decimals: 1 },
          { channelNum: 1, header: 'a,b', decimals: 0 },
        ],
        () => 480,
      ),
    ]
    expect(lines).toEqual(['时间,温度 (℃),"a,b"', '2026-10-20 08:00:00,1.2,', '2026-10-20 08:00:10,2.5,3'])
  })
})
