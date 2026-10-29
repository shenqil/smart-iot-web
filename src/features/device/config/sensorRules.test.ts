import { describe, expect, it } from 'vitest'
import type { SensorView } from './api'
import {
  calibrationSummary,
  cloneRule,
  copyChannel,
  newRule,
  prepareSensors,
  ruleSummary,
  type SensorDraft,
  toDraft,
  validateSensors,
} from './sensorRules'

const view: SensorView = {
  channel: 0,
  standardSensorId: 3,
  standardName: '空气温度',
  label: '空气温度',
  unit: '℃',
  rangeMin: -40,
  rangeMax: 80,
  resolution: 0.1,
  calibration: { scale: 1, offset: 0 },
  simulation: null as never,
  rules: [
    {
      id: 7,
      enabled: true,
      condition: 'greater',
      threshold: 35,
      level: 2,
      repeatSeconds: 300,
      createAlarm: true,
      actionCount: 2,
    },
  ],
}
const temp: SensorDraft = toDraft(view)

describe('传感器配置', () => {
  it('详情 → 草稿：恒等校准不保留，规则以 id 作行键', () => {
    expect(temp.calibration).toBeUndefined()
    expect(temp.simulation).toBeUndefined()
    expect(temp.rules[0]).toMatchObject({ id: 7, key: 'r7', actionCount: 2 })
  })
  it('新规则没有 id', () => {
    const r = newRule()
    expect(r.id).toBeUndefined()
    expect(r.key).toBeTruthy()
  })
  it('复制通道：规则作为新规则 (不带 id，联动不复制)', () => {
    const c = copyChannel(temp, 3)
    expect(c.channel).toBe(3)
    expect(c.rules[0].id).toBeUndefined()
    expect(c.rules[0].actionCount).toBeUndefined()
    expect(c.rules[0].key).not.toBe(temp.rules[0].key)
    expect(temp.rules[0].threshold).toBe(35)
    expect(cloneRule(temp.rules[0]).threshold).toBe(35)
  })
  it('保存前：去掉显示字段与行键，空白文本不提交，按通道排序', () => {
    const out = prepareSensors([
      { channel: 5, rules: [{ ...newRule(), condition: 'less', threshold: 1 }] },
      { channel: 1, name: '  ', standardName: 'x', rules: [], calibration: { scale: 1, offset: 0 } },
      temp,
    ])
    expect(out.map((s) => s.channel)).toEqual([0, 1, 5])
    expect(out[1].name).toBeUndefined()
    expect(out[1].calibration).toBeUndefined()
    expect('standardName' in out[1]).toBe(false)
    expect(out[0].rules?.[0]).toEqual({
      id: 7,
      enabled: true,
      condition: 'greater',
      threshold: 35,
      level: 2,
      repeatSeconds: 300,
      createAlarm: true,
    })
  })
  it('校验：量程、区间、推送间隔、校准系数、通道越界', () => {
    const errs = validateSensors(
      [
        { ...temp, rangeMin: 100, rangeMax: 0, calibration: { scale: 0, offset: 1 } },
        { channel: 16, rules: [{ ...newRule(), condition: 'between', lower: 5, upper: 1, repeatSeconds: 0 }] },
      ],
      16,
    )
    expect(errs).toHaveLength(5)
    expect(validateSensors([temp], 16)).toEqual([])
  })
  it('说明文字', () => {
    expect(ruleSummary({ condition: 'between', lower: 1, upper: 2 }, '℃')).toBe('1 ~ 2 ℃')
    expect(ruleSummary({ condition: 'greater', threshold: 35 })).toBe('> 35')
    expect(calibrationSummary({ calibration: { scale: 1.02, offset: 0 } })).toBe('×1.02')
    expect(calibrationSummary({ calibration: { scale: 1, offset: -0.5 } })).toBe('-0.5')
    expect(calibrationSummary({ simulation: { base: 20, jitter: 1 } })).toBe('模拟 20 ±1')
    expect(calibrationSummary({})).toBe('—')
  })
})
