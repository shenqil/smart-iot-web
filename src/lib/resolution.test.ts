import { describe, expect, it } from 'vitest'
import { decimalsOf, formatValue } from './resolution'

describe('分辨率', () => {
  it('小数位', () => {
    expect([10, 1, 0.1, 0.01, 0.001, 0, undefined].map(decimalsOf)).toEqual([0, 0, 1, 2, 3, 2, 2])
  })
  it('格式化', () => {
    expect(formatValue(25.345, 0.1)).toBe('25.3')
    expect(formatValue(null, 0.1)).toBe('—')
    expect(formatValue(1234.5, 10)).toBe('1235')
  })
})
