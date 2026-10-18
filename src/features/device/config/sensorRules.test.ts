import { describe, expect, it } from 'vitest'
import { UUID_RE } from '@/utils/uuid'
import type { SensorConfig } from './api'
import { copyChannel, correctionSummary, newRule, prepareSensors, ruleSummary, validateSensors } from './sensorRules'

const temp: SensorConfig = {
  channelNum: 0,
  standardName: '空气温度',
  unit: '℃',
  minValue: -40,
  maxValue: 80,
  resolution: 0.1,
  alertConfigs: [
    {
      code: '6f1c2a10-0000-4000-8000-000000000001',
      enabled: true,
      alertType: 'greater',
      threshold: 35,
      repeatInterval: 300,
    },
  ],
}

describe('传感器配置', () => {
  it('新规则带小写 UUID 编码', () => {
    expect(newRule().code).toMatch(UUID_RE)
  })
  it('复制通道时规则换新编码', () => {
    const c = copyChannel(temp, 3)
    expect(c.channelNum).toBe(3)
    expect(c.alertConfigs?.[0].code).not.toBe(temp.alertConfigs?.[0].code)
    expect(c.alertConfigs?.[0].code).toMatch(UUID_RE)
    expect(temp.alertConfigs?.[0].threshold).toBe(35)
  })
  it('保存前给启用但缺编码的规则补编码，并按通道排序', () => {
    const out = prepareSensors([
      { channelNum: 5, alertConfigs: [{ enabled: true, alertType: 'less', threshold: 1, repeatInterval: 60 }] },
      { channelNum: 1, displayName: '  ' },
    ])
    expect(out.map((s) => s.channelNum)).toEqual([1, 5])
    expect(out[0].displayName).toBeUndefined()
    expect(out[1].alertConfigs?.[0].code).toMatch(UUID_RE)
  })
  it('校验：量程、区间、推送间隔、编码重复、通道越界', () => {
    const errs = validateSensors(
      [
        { ...temp, minValue: 100, maxValue: 0 },
        {
          channelNum: 16,
          alertConfigs: [
            {
              code: temp.alertConfigs?.[0].code,
              enabled: true,
              alertType: 'range',
              minValue: 5,
              maxValue: 1,
              repeatInterval: 0,
            },
          ],
        },
      ],
      16,
    )
    expect(errs).toHaveLength(5)
    expect(validateSensors([temp], 16)).toEqual([])
  })
  it('说明文字', () => {
    expect(ruleSummary({ enabled: true, alertType: 'range', minValue: 1, maxValue: 2, repeatInterval: 1 }, '℃')).toBe(
      '1 ~ 2 ℃',
    )
    expect(correctionSummary({ channelNum: 0, correction: { mode: 'coefficient', coefficientValue: 1.02 } })).toBe(
      '×1.02',
    )
    expect(correctionSummary({ channelNum: 0 })).toBe('—')
  })
})
