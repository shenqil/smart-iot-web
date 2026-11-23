import { describe, expect, it } from 'vitest'
import { deviceTypeColor } from './deviceTypeColor'

describe('deviceTypeColor', () => {
  it('同一类型颜色固定，未分类单独一色', () => {
    expect(deviceTypeColor(1)).toBe(deviceTypeColor(1))
    expect(deviceTypeColor(1)).not.toBe(deviceTypeColor(2))
    expect(deviceTypeColor(null)).toBe('#a5b6a9')
  })
})
