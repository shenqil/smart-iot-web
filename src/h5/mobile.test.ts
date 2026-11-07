import { beforeEach, describe, expect, it, vi } from 'vitest'
import { comparisonDate, parseBizTime, validateRange } from './analysisRange'
import { positiveId, readDeviceFilters } from './filters'
import { preferenceKey, useMobilePreferences } from './preferences'
import { mobileEquivalent } from './routing'

beforeEach(() => {
  useMobilePreferences.setState({ entries: {} })
})
describe('H5 URL 与筛选', () => {
  it('保留旧数据端深链条件，管理端与大屏不跳转', () => {
    expect(mobileEquivalent('/app/3/monitor', '?deviceId=7&siteId=8&tab=history')).toBe(
      '/h5/3/devices?deviceId=7&siteId=8&tab=history',
    )
    expect(mobileEquivalent('/app/3/monitor', '')).toBe('/h5/3/home')
    expect(mobileEquivalent('/app/3/alarms', '?processed=false')).toBe('/h5/3/alarms?processed=false')
    expect(mobileEquivalent('/screen/3', '')).toBeNull()
    expect(mobileEquivalent('/tenant/3', '')).toBeNull()
  })
  it('拒绝无效 ID、能力参数，保留合法服务端筛选', () => {
    expect(positiveId('9007199254740993')).toBeUndefined()
    expect(positiveId('-2')).toBeUndefined()
    expect(
      readDeviceFilters(new URLSearchParams('siteId=2&capability=relay&hasAlarm=true')),
    ).toMatchObject({ siteId: 2, capability: 'relay', hasAlarm: true })
    expect(readDeviceFilters(new URLSearchParams('capability=oops'))).toMatchObject({
      capability: undefined,
    })
  })
})
describe('本地偏好隔离', () => {
  it('按账号和企业隔离关注；取消关注不影响其他范围', () => {
    const s = useMobilePreferences.getState(),
      d = { id: 1, name: '温室' }
    s.toggle(1, 2, d)
    s.toggle(2, 2, d)
    s.toggle(1, 3, d)
    s.toggle(1, 2, d)
    const e = useMobilePreferences.getState().entries
    expect(e[preferenceKey(1, 2)].favorites).toEqual([])
    expect(e[preferenceKey(2, 2)].favorites).toEqual([d])
    expect(e[preferenceKey(1, 3)].favorites).toEqual([d])
  })
  it('最近访问去重、更新名称和园区，最多 20 条', () => {
    const s = useMobilePreferences.getState()
    for (let id = 1; id <= 25; id++) s.visit(1, 2, { id, name: String(id) })
    s.visit(1, 2, { id: 20, name: '新名称', siteId: 7 })
    const list = useMobilePreferences.getState().entries['1:2'].recent
    expect(list).toHaveLength(20)
    expect(list[0]).toEqual({ id: 20, name: '新名称', siteId: 7 })
    expect(list.filter((d) => d.id === 20)).toHaveLength(1)
  })
})
describe('历史范围与畸形深链', () => {
  it('无效时间不抛异常，拒绝日期溢出', () => {
    expect(() => validateRange('abc', '2026-11-02T10:00')).not.toThrow()
    expect(parseBizTime('2026-02-31T00:00').isValid()).toBe(false)
    expect(validateRange('abc', '2026-11-02T10:00')).toBeTruthy()
  })
  it('限制明细保留期、31 天以及未来时间', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-02T02:00:00Z'))
    expect(validateRange('2026-11-02T09:00', '2026-11-02T10:00')).toBe('')
    expect(validateRange('2026-10-01T00:00', '2026-11-02T10:00')).toContain('31')
    expect(validateRange('2026-09-30T00:00', '2026-10-01T00:00')).toContain('保留')
    expect(validateRange('2026-11-02T09:00', '2026-11-03T00:00')).toContain('当前')
    expect(comparisonDate('2026-02-31')).toBe('2026-11-02')
    expect(comparisonDate('oops', true)).toBe('2026-11')
    vi.useRealTimers()
  })
})
