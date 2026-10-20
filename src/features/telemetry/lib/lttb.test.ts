import { describe, expect, it } from 'vitest'
import { lowerBound, lttb } from './lttb'

const pairs = (a: Float64Array) => Array.from({ length: a.length / 2 }, (_, i) => [a[i * 2], a[i * 2 + 1]])

describe('lttb', () => {
  it('点数不超过阈值时原样返回 (跳过 NaN)', () => {
    expect(pairs(lttb([1, 2, 3], [10, Number.NaN, 30], 10))).toEqual([
      [1, 10],
      [3, 30],
    ])
  })
  it('降到阈值点数，保留首尾与尖峰', () => {
    const xs = Array.from({ length: 1000 }, (_, i) => i)
    const ys = xs.map((x) => (x === 500 ? 100 : Math.sin(x / 50)))
    const out = pairs(lttb(xs, ys, 50))
    expect(out).toHaveLength(50)
    expect(out[0]).toEqual([0, ys[0]])
    expect(out[49]).toEqual([999, ys[999]])
    expect(out.some(([x]) => x === 500)).toBe(true)
    // x 递增
    expect(out.every(([x], i) => i === 0 || x > out[i - 1][0])).toBe(true)
  })
  it('只取区间', () => {
    const out = pairs(lttb([0, 1, 2, 3, 4], [0, 1, 2, 3, 4], 100, 1, 3))
    expect(out).toEqual([
      [1, 1],
      [2, 2],
    ])
  })
  it('lowerBound', () => {
    expect(lowerBound([1, 3, 5], 3)).toBe(1)
    expect(lowerBound([1, 3, 5], 4)).toBe(2)
    expect(lowerBound([1, 3, 5], 9)).toBe(3)
  })
})
