import { describe, expect, it } from 'vitest'
import { ApiError, NETWORK_ERROR } from '@/api/errors'
import { interpretControl, type RelayOp } from './api'

const op = (p: Partial<RelayOp>): RelayOp =>
  ({
    id: 1,
    deviceId: 1,
    deviceSn: 'GW',
    relayIndex: 0,
    targetState: 1,
    status: 'success',
    actualState: 1,
    ...p,
  }) as RelayOp

describe('interpretControl', () => {
  it('成功：显示设备回报状态', () => {
    expect(interpretControl({ ok: true, data: op({}) })).toMatchObject({
      level: 'success',
      actualState: 1,
      refresh: true,
    })
  })
  it('失败且有实际状态：不一致', () => {
    expect(interpretControl({ ok: true, data: op({ status: 'failed', actualState: 0 }) })).toMatchObject({
      level: 'warning',
      actualState: 0,
    })
  })
  it('失败无实际状态：显示错误信息，保持原状态', () => {
    const o = interpretControl({
      ok: true,
      data: op({ status: 'failed', actualState: null, errorMessage: '设备繁忙' }),
    })
    expect(o).toMatchObject({ level: 'error', message: '设备繁忙', refresh: false })
    expect(o.actualState).toBeUndefined()
  })
  it('超时：刷新两次', () => {
    expect(interpretControl({ ok: true, data: op({ status: 'timeout', actualState: null }) })).toMatchObject({
      refresh: true,
      refreshAgain: true,
    })
  })
  it('通道忙 / 设备不可控 / 服务不可用', () => {
    expect(interpretControl({ ok: false, error: new ApiError(409, 'RELAY_BUSY', 'x') }).message).toBe(
      '该通道正在被操作，请稍后',
    )
    expect(interpretControl({ ok: false, error: new ApiError(409, 'DEVICE_OFFLINE', 'x') })).toMatchObject({
      lockAll: true,
    })
    expect(interpretControl({ ok: false, error: new ApiError(503, 'SERVICE_UNAVAILABLE', 'x') }).message).toBe(
      '服务暂不可用，请稍后重试',
    )
  })
  it('网络错误 / 前端超时：结果未确认', () => {
    expect(interpretControl({ ok: false, error: new ApiError(0, NETWORK_ERROR, 'x') }).message).toContain('结果未确认')
    expect(interpretControl({ ok: false, error: new DOMException('timeout', 'TimeoutError') }).message).toContain(
      '结果未确认',
    )
  })
  it('401 交给全局处理', () => {
    expect(interpretControl({ ok: false, error: new ApiError(401, 'UNAUTHORIZED', 'x') }).global).toBe(true)
  })
})
