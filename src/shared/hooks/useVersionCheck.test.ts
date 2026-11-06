import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkVersion, fetchVersion, useVersionCheck } from './useVersionCheck'

describe('version check logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fetchVersion fetches version with no-cache and trims whitespace', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(' 1791820868361 \n'),
    } as unknown as Response)

    const version = await fetchVersion(false)
    expect(version).toBe('1791820868361')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^\/version\.txt\?t=\d+$/),
      expect.objectContaining({
        method: 'GET',
        cache: 'no-cache',
      }),
    )
  })

  it('fetchVersion returns null when error in dev mode', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const version = await fetchVersion(true)
    expect(version).toBeNull()
  })

  it('checkVersion returns true when timestamp changes', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('2000000000000'),
    } as unknown as Response)

    const hasUpdate = await checkVersion('1000000000000', false)
    expect(hasUpdate).toBe(true)
  })

  it('checkVersion returns false when timestamp is the same', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('1000000000000'),
    } as unknown as Response)

    const hasUpdate = await checkVersion('1000000000000', false)
    expect(hasUpdate).toBe(false)
  })

  it('checkVersion returns false if current timestamp is missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('2000000000000'),
    } as unknown as Response)

    const hasUpdate = await checkVersion(undefined, false)
    expect(hasUpdate).toBe(false)
  })

  it('useVersionCheck triggers countdown and reload when update detected', async () => {
    window.__BUILD_TIMESTAMP__ = '1000'
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('2000'),
    } as unknown as Response)

    const reloadMock = vi.fn()

    const { result } = renderHook(() =>
      useVersionCheck({
        enabled: true,
        checkIntervalMs: 5000,
        countdownSeconds: 3,
        onReload: reloadMock,
      }),
    )

    // Initially not visible
    expect(result.current.visible).toBe(false)

    // Flush initial fetch
    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.visible).toBe(true)
    expect(result.current.countdown).toBe(3)

    // Advance 1 second
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.countdown).toBe(2)

    // Advance remaining 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(reloadMock).toHaveBeenCalled()

    delete window.__BUILD_TIMESTAMP__
  })
})
