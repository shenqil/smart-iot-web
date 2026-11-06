import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OfflineBanner } from './OfflineBanner'

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when initially online', () => {
    render(<OfflineBanner />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows offline banner when window offline event fires', () => {
    render(<OfflineBanner />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('网络已断开，正在使用离线缓存数据')).toBeInTheDocument()
  })

  it('shows restored banner and triggers reconnect callback when online event fires', () => {
    const onReconnect = vi.fn()
    render(<OfflineBanner onReconnect={onReconnect} dismissDelayMs={1000} />)

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByText('网络已断开，正在使用离线缓存数据')).toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect(onReconnect).toHaveBeenCalledTimes(1)
    expect(screen.getByText('网络已恢复，正在同步最新数据…')).toBeInTheDocument()

    // After dismissDelayMs, banner should hide
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
