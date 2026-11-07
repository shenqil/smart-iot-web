import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PtzPanel } from './PtzPanel'

const calls: { action: string; direction: number; speed?: number }[] = []
vi.mock('./api', async (orig) => ({
  ...(await orig<typeof import('./api')>()),
  controlPTZ: vi.fn(async (_c: number, _d: number, body: { action: string; direction: number; speed?: number }) => {
    calls.push(body)
    return { data: undefined }
  }),
}))

function setup() {
  const router = createMemoryRouter([{ path: '/app/:companyId', element: <PtzPanel deviceId={7} ptz zoom /> }], {
    initialEntries: ['/app/3'],
  })
  return render(<RouterProvider router={router} />)
}

describe('PtzPanel', () => {
  beforeEach(() => {
    calls.length = 0
  })

  it('按住开始转动，松开停止', async () => {
    setup()
    const left = screen.getByRole('button', { name: '向左' })
    await act(async () => {
      fireEvent.pointerDown(left, { button: 0, pointerId: 1 })
    })
    await act(async () => {
      fireEvent.pointerUp(left, { pointerId: 1 })
    })
    expect(calls).toEqual([
      { action: 'start', direction: 2, speed: 1 },
      { action: 'stop', direction: 2, speed: 1 },
    ])
  })

  it('键盘按住同样生效，重复按键不重复发送；卸载时停止', async () => {
    const { unmount } = setup()
    const zoomIn = screen.getByRole('button', { name: '放大' })
    await act(async () => {
      fireEvent.keyDown(zoomIn, { key: 'Enter' })
      fireEvent.keyDown(zoomIn, { key: 'Enter', repeat: true })
    })
    expect(calls).toEqual([{ action: 'start', direction: 8, speed: 1 }])
    await act(async () => unmount())
    expect(calls.at(-1)).toEqual({ action: 'stop', direction: 8, speed: 1 })
  })

  it('同时只控制一个方向', async () => {
    setup()
    await act(async () => {
      fireEvent.pointerDown(screen.getByRole('button', { name: '向上' }), { button: 0, pointerId: 1 })
      fireEvent.pointerDown(screen.getByRole('button', { name: '向下' }), { button: 0, pointerId: 2 })
    })
    expect(calls.map((c) => c.direction)).toEqual([0])
  })

  it('停止间隔 500ms 和 900ms 分别补充调用两次 stop', async () => {
    vi.useFakeTimers()
    try {
      setup()
      const left = screen.getByRole('button', { name: '向左' })
      await act(async () => {
        fireEvent.pointerDown(left, { button: 0, pointerId: 1 })
      })
      await act(async () => {
        fireEvent.pointerUp(left, { pointerId: 1 })
      })
      expect(calls).toEqual([
        { action: 'start', direction: 2, speed: 1 },
        { action: 'stop', direction: 2, speed: 1 },
      ])

      // 快进 500ms
      await act(async () => {
        vi.advanceTimersByTime(500)
      })
      expect(calls).toEqual([
        { action: 'start', direction: 2, speed: 1 },
        { action: 'stop', direction: 2, speed: 1 },
        { action: 'stop', direction: 2, speed: 1 },
      ])

      // 快进 400ms (到 900ms)
      await act(async () => {
        vi.advanceTimersByTime(400)
      })
      expect(calls).toEqual([
        { action: 'start', direction: 2, speed: 1 },
        { action: 'stop', direction: 2, speed: 1 },
        { action: 'stop', direction: 2, speed: 1 },
        { action: 'stop', direction: 2, speed: 1 },
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('松开后所有按钮锁住 1s 不让点击，1s 后自动解锁且可正常进行第二次控制', async () => {
    vi.useFakeTimers()
    try {
      setup()
      const left = screen.getByRole('button', { name: '向左' })
      const right = screen.getByRole('button', { name: '向右' })

      // 第一次点击并松开
      await act(async () => {
        fireEvent.pointerDown(left, { button: 0, pointerId: 1 })
        fireEvent.pointerUp(left, { pointerId: 1 })
      })

      // 处于锁定状态
      expect(left).toBeDisabled()
      expect(right).toBeDisabled()
      expect(screen.getByText('云台调整中，稍候可继续控制…')).toBeInTheDocument()

      // 200ms 时尝试点击右键，被拦截
      await act(async () => {
        vi.advanceTimersByTime(200)
        fireEvent.pointerDown(right, { button: 0, pointerId: 2 })
      })
      // 没有调用新的 start
      expect(calls).toEqual([
        { action: 'start', direction: 2, speed: 1 },
        { action: 'stop', direction: 2, speed: 1 },
      ])

      // 推进到 500ms，触发第一次操作的第 1 次补充 stop
      await act(async () => {
        vi.advanceTimersByTime(300)
      })
      expect(calls).toEqual([
        { action: 'start', direction: 2, speed: 1 },
        { action: 'stop', direction: 2, speed: 1 },
        { action: 'stop', direction: 2, speed: 1 },
      ])

      // 推进到 900ms，触发第 2 次补充 stop
      await act(async () => {
        vi.advanceTimersByTime(400)
      })
      expect(calls).toEqual([
        { action: 'start', direction: 2, speed: 1 },
        { action: 'stop', direction: 2, speed: 1 },
        { action: 'stop', direction: 2, speed: 1 },
        { action: 'stop', direction: 2, speed: 1 },
      ])

      // 推进到 1000ms，解锁
      await act(async () => {
        vi.advanceTimersByTime(100)
      })
      expect(left).not.toBeDisabled()
      expect(right).not.toBeDisabled()
      expect(screen.getByText('按住方向键转动，松开停止')).toBeInTheDocument()

      // 第二次点击
      await act(async () => {
        fireEvent.pointerDown(right, { button: 0, pointerId: 3 })
      })
      expect(calls).toEqual([
        { action: 'start', direction: 2, speed: 1 },
        { action: 'stop', direction: 2, speed: 1 },
        { action: 'stop', direction: 2, speed: 1 },
        { action: 'stop', direction: 2, speed: 1 },
        { action: 'start', direction: 3, speed: 1 },
      ])

      // 松开第二次点击
      await act(async () => {
        fireEvent.pointerUp(right, { pointerId: 3 })
      })
      expect(calls.at(-1)).toEqual({ action: 'stop', direction: 3, speed: 1 })

      // 第二次点击的 500ms 和 900ms 补充 stop
      await act(async () => {
        vi.advanceTimersByTime(500)
      })
      expect(calls.at(-1)).toEqual({ action: 'stop', direction: 3, speed: 1 })
      await act(async () => {
        vi.advanceTimersByTime(400)
      })
      expect(calls.at(-1)).toEqual({ action: 'stop', direction: 3, speed: 1 })
    } finally {
      vi.useRealTimers()
    }
  })
})
