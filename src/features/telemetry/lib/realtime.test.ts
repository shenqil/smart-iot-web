import { describe, expect, it } from 'vitest'
import { INVALID_READING } from '@/lib/resolution'
import { agoText, channelName, isVideoDeviceType, opDisplayStatus, readSensor, relayBlockedReason } from './realtime'

const cfg = {
  channelNum: 1,
  displayName: '',
  standardName: '空气温度',
  unit: '℃',
  resolution: 0.1,
  minValue: -40,
  maxValue: 80,
}

describe('readSensor', () => {
  it('按下标取值并按分辨率格式化', () => {
    const r = readSensor(cfg, [0, 25.34])
    expect(r).toMatchObject({ name: '空气温度', value: 25.34, text: '25.3', state: 'ok' })
    expect(r.position).toBeCloseTo(65.34 / 120)
  })
  it('超量程夹在两端', () => {
    expect(readSensor(cfg, [0, 90])).toMatchObject({ state: 'over', position: 1 })
    expect(readSensor(cfg, [0, -50])).toMatchObject({ state: 'under', position: 0 })
  })
  it('无读数与没有数据', () => {
    expect(readSensor(cfg, [0, INVALID_READING])).toMatchObject({ state: 'invalid', text: '无读数', value: null })
    expect(readSensor(cfg, null)).toMatchObject({ state: 'empty', text: '—' })
    expect(readSensor(cfg, [0])).toMatchObject({ state: 'empty' })
  })
  it('负零显示为 0', () => {
    expect(readSensor({ channelNum: 0, resolution: 1 }, [-0.4]).text).toBe('0')
  })
  it('量程未配置时没有位置', () => {
    expect(readSensor({ channelNum: 0 }, [3]).position).toBeNull()
  })
})

describe('辅助函数', () => {
  it('通道名称回落', () => {
    expect(channelName({ channelNum: 2, displayName: ' 1号棚 ' })).toBe('1号棚')
    expect(channelName({ channelNum: 2 })).toBe('通道 2')
  })
  it('视频监控类型', () => {
    expect(isVideoDeviceType('视频监控')).toBe(true)
    expect(isVideoDeviceType('网关')).toBe(false)
    expect(isVideoDeviceType(null)).toBe(false)
  })
  it('继电器可操作条件', () => {
    expect(relayBlockedReason({ status: 'active' }, true)).toBeNull()
    expect(relayBlockedReason({ status: 'active' }, false)).toBe('设备离线')
    expect(relayBlockedReason({ status: 'inactive' }, true)).toBe('设备已停用')
    expect(relayBlockedReason({ status: 'fault' }, true)).toBe('设备已损坏')
  })
  it('pending 超过 1 分钟视为超时', () => {
    const now = Date.parse('2026-10-20T10:00:00+08:00')
    expect(opDisplayStatus({ status: 'pending', createdAt: '2026-10-20T09:58:00+08:00' }, now)).toBe('timeout')
    expect(opDisplayStatus({ status: 'pending', createdAt: '2026-10-20T09:59:30+08:00' }, now)).toBe('pending')
    expect(opDisplayStatus({ status: 'success', createdAt: '2026-10-20T09:00:00+08:00' }, now)).toBe('success')
  })
  it('相对时间', () => {
    const now = Date.parse('2026-10-20T10:00:00+08:00')
    expect(agoText('2026-10-20T09:59:52+08:00', now)).toBe('8 秒前')
    expect(agoText('2026-10-20T09:57:00+08:00', now)).toBe('3 分钟前')
    expect(agoText(null, now)).toBe('—')
  })
})
