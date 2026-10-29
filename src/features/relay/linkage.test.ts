import { describe, expect, it } from 'vitest'
import { linkageActionText, linkageTriggerText } from './linkage'

describe('linkage text', () => {
  it('触发说明：设备名 (无名称时 SN) · 规则描述', () => {
    expect(
      linkageTriggerText({ sourceDeviceName: '1号棚', sourceDeviceSn: 'GW-1', description: '空气温度 > 35 ℃' }),
    ).toBe('1号棚 · 空气温度 > 35 ℃')
    expect(linkageTriggerText({ sourceDeviceName: '', sourceDeviceSn: 'GW-1', description: 'EC < 1.2' })).toBe(
      'GW-1 · EC < 1.2',
    )
    expect(linkageActionText(1)).toBe('开启')
    expect(linkageActionText(0)).toBe('关闭')
  })
})
