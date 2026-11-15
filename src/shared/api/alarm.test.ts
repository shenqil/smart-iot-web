import { describe, expect, it } from 'vitest'
import { formatUnprocessedCount } from './alarm'

describe('formatUnprocessedCount', () => {
  it('不超过 99 且未达上限时返回数字字符串', () => {
    expect(formatUnprocessedCount({ count: 0, capped: false })).toBe('0')
    expect(formatUnprocessedCount({ count: 42, capped: false })).toBe('42')
    expect(formatUnprocessedCount({ count: 99, capped: false })).toBe('99')
  })

  it('超过 99 或达到后端上限 (capped=true) 时统一返回 99+', () => {
    expect(formatUnprocessedCount({ count: 100, capped: false })).toBe('99+')
    expect(formatUnprocessedCount({ count: 1000, capped: true })).toBe('99+')
  })
})
