import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePtzControl } from './usePtzControl'

describe('usePtzControl', () => {
  const controlMock = vi.fn(async () => ({ data: undefined }))

  beforeEach(() => {
    controlMock.mockReset().mockResolvedValue({ data: undefined } as never)
  })

  it('初始状态为未激活、未锁定，默认速度为 1', () => {
    const { result } = renderHook(() => usePtzControl({ companyId: 1, deviceId: 2, control: controlMock as never }))
    expect(result.current.active).toBeNull()
    expect(result.current.locked).toBe(false)
    expect(result.current.speed).toBe(1)
    expect(result.current.uncertain).toBeNull()
  })

  it('支持修改速度', () => {
    const { result } = renderHook(() => usePtzControl({ companyId: 1, deviceId: 2, control: controlMock as never }))
    act(() => {
      result.current.setSpeed(2)
    })
    expect(result.current.speed).toBe(2)
  })

  it('start 时发送 start 指令，stop 时等待 start 并发送 stop', async () => {
    const { result } = renderHook(() => usePtzControl({ companyId: 1, deviceId: 2, control: controlMock as never }))
    act(() => {
      result.current.start(0)
    })
    expect(result.current.active).toBe(0)
    expect(controlMock).toHaveBeenCalledWith(1, 2, { action: 'start', direction: 0, speed: 1 })

    await act(async () => {
      await result.current.stop()
    })
    expect(result.current.active).toBeNull()
    expect(result.current.locked).toBe(true)
    expect(controlMock).toHaveBeenLastCalledWith(1, 2, { action: 'stop', direction: 0, speed: 1 })
  })

  it('松开后锁定 1s，并在 500ms 和 900ms 触发两次补充 stop', async () => {
    vi.useFakeTimers()
    try {
      const { result } = renderHook(() => usePtzControl({ companyId: 1, deviceId: 2, control: controlMock as never }))
      act(() => {
        result.current.start(2)
      })
      await act(async () => {
        await result.current.stop()
      })
      expect(controlMock).toHaveBeenCalledTimes(2)
      expect(result.current.locked).toBe(true)

      // 500ms: 第 1 次补充 stop
      await act(async () => {
        vi.advanceTimersByTime(500)
      })
      expect(controlMock).toHaveBeenCalledTimes(3)

      // 900ms: 第 2 次补充 stop
      await act(async () => {
        vi.advanceTimersByTime(400)
      })
      expect(controlMock).toHaveBeenCalledTimes(4)

      // 1000ms: 解锁
      await act(async () => {
        vi.advanceTimersByTime(100)
      })
      expect(result.current.locked).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('stop 失败记录 uncertain 状态，可重试停止成功', async () => {
    controlMock
      .mockResolvedValueOnce({ data: undefined } as never) // start
      .mockRejectedValueOnce(new Error('网络超时')) // stop

    const onError = vi.fn()
    const { result } = renderHook(() =>
      usePtzControl({ companyId: 1, deviceId: 2, control: controlMock as never, onError }),
    )

    act(() => {
      result.current.start(3)
    })
    await act(async () => {
      await result.current.stop()
    })

    expect(result.current.uncertain).toBe(3)
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'stop')

    // 重试停止成功
    controlMock.mockResolvedValueOnce({ data: undefined } as never)
    await act(async () => {
      await result.current.retryStop()
    })
    expect(result.current.uncertain).toBeNull()
  })
})
