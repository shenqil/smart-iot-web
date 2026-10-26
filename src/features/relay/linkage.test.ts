import { describe, expect, it } from 'vitest'
import { linkageActionText, linkageCondText } from './linkage'

describe('linkage text', () => {
  it('formats rule conditions', () => {
    expect(linkageCondText({ alertType: 'less', threshold: 1.2, minValue: 0, maxValue: 0, unit: 'ms/cm' })).toBe(
      '小于 1.2 ms/cm',
    )
    expect(linkageCondText({ alertType: 'range', threshold: 0, minValue: 1, maxValue: 2, unit: '' })).toBe('处于 1 ~ 2')
    expect(linkageActionText(1)).toBe('开启')
    expect(linkageActionText(0)).toBe('关闭')
  })
})
