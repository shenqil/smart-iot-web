import { controlPTZ } from '@shared/api/camera'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Ptz } from './VideoPanel'

vi.mock('@shared/api/camera', async (orig) => ({
  ...(await orig<typeof import('@shared/api/camera')>()),
  controlPTZ: vi.fn(async () => ({ data: undefined })),
}))
vi.mock('../ui', async (orig) => ({ ...(await orig<typeof import('../ui')>()), showFailure: vi.fn() }))
function setup() {
  return render(
    <RouterProvider
      router={createMemoryRouter([{ path: '/h5/:companyId', element: <Ptz id={7} ptz zoom /> }], {
        initialEntries: ['/h5/3'],
      })}
    />,
  )
}
afterEach(cleanup)
beforeEach(() => {
  vi.mocked(controlPTZ)
    .mockReset()
    .mockResolvedValue({ data: undefined } as never)
})
describe('移动端云台控制', () => {
  it('启动请求完成后才能发送停止，避免弱网下指令倒序', async () => {
    let resolve!: () => void
    vi.mocked(controlPTZ).mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = () => r({ data: undefined } as never)
        }),
    )
    setup()
    const button = screen.getByRole('button', { name: '← 向左' })
    await act(async () => {
      fireEvent.keyDown(button, { key: 'Enter' })
      fireEvent.keyDown(button, { key: 'Enter', repeat: true })
      fireEvent.keyUp(button, { key: 'Enter' })
    })
    expect(controlPTZ).toHaveBeenCalledTimes(1)
    await act(async () => resolve())
    expect(controlPTZ).toHaveBeenNthCalledWith(2, 3, 7, { action: 'stop', direction: 2, speed: 1 })
  })
  it('卸载也发送对应停止', async () => {
    const { unmount } = setup()
    await act(async () => fireEvent.keyDown(screen.getByRole('button', { name: '＋ 放大' }), { key: ' ' }))
    await act(async () => unmount())
    expect(controlPTZ).toHaveBeenNthCalledWith(2, 3, 7, { action: 'stop', direction: 8, speed: 1 })
  })
  it('停止失败明确提示并锁定新方向，允许重新停止', async () => {
    vi.mocked(controlPTZ)
      .mockResolvedValueOnce({ data: undefined } as never)
      .mockRejectedValueOnce(new Error('弱网'))
    setup()
    const button = screen.getByRole('button', { name: '↑ 向上' })
    await act(async () => {
      fireEvent.keyDown(button, { key: 'Enter' })
      fireEvent.keyUp(button, { key: 'Enter' })
    })
    expect(await screen.findByText('停止指令未确认，请重试停止并检查摄像头。')).toBeInTheDocument()
    expect(button).toBeDisabled()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '重试停止' })))
    await waitFor(() => expect(button).not.toBeDisabled())
    expect(controlPTZ).toHaveBeenLastCalledWith(3, 7, { action: 'stop', direction: 0, speed: 1 })
  })
  it('停止间隔 500ms 后没有点击其他方向，补充调用一次 stop', async () => {
    vi.useFakeTimers()
    try {
      setup()
      const button = screen.getByRole('button', { name: '← 向左' })
      await act(async () => {
        fireEvent.keyDown(button, { key: 'Enter' })
        fireEvent.keyUp(button, { key: 'Enter' })
      })
      expect(controlPTZ).toHaveBeenCalledTimes(2)
      await act(async () => {
        vi.advanceTimersByTime(500)
      })
      expect(controlPTZ).toHaveBeenCalledTimes(3)
      expect(controlPTZ).toHaveBeenLastCalledWith(3, 7, { action: 'stop', direction: 2, speed: 1 })
    } finally {
      vi.useRealTimers()
    }
  })
  it('松开后所有按钮锁住 600ms 不让点击，600ms 后自动解锁且可正常进行第二次控制', async () => {
    vi.useFakeTimers()
    try {
      setup()
      const left = screen.getByRole('button', { name: '← 向左' })
      const right = screen.getByRole('button', { name: '→ 向右' })
      await act(async () => {
        fireEvent.pointerDown(left, { button: 0, pointerId: 1 })
        fireEvent.pointerUp(left, { pointerId: 1 })
      })

      // 处于锁定状态
      expect(left).toBeDisabled()
      expect(right).toBeDisabled()

      // 200ms 尝试点击被拦截
      await act(async () => {
        vi.advanceTimersByTime(200)
        fireEvent.pointerDown(right, { button: 0, pointerId: 2 })
      })
      expect(controlPTZ).toHaveBeenCalledTimes(2) // 仅第一次的 start 和 stop

      // 500ms 触发第一次补充 stop
      await act(async () => {
        vi.advanceTimersByTime(300)
      })
      expect(controlPTZ).toHaveBeenCalledTimes(3)

      // 600ms 解锁
      await act(async () => {
        vi.advanceTimersByTime(100)
      })
      expect(left).not.toBeDisabled()
      expect(right).not.toBeDisabled()

      // 第二次点击
      await act(async () => {
        fireEvent.pointerDown(right, { button: 0, pointerId: 3 })
      })
      expect(controlPTZ).toHaveBeenCalledTimes(4)
      expect(controlPTZ).toHaveBeenLastCalledWith(3, 7, { action: 'start', direction: 3, speed: 1 })

      await act(async () => {
        fireEvent.pointerUp(right, { pointerId: 3 })
      })
      expect(controlPTZ).toHaveBeenCalledTimes(5)
      expect(controlPTZ).toHaveBeenLastCalledWith(3, 7, { action: 'stop', direction: 3, speed: 1 })

      await act(async () => {
        vi.advanceTimersByTime(500)
      })
      expect(controlPTZ).toHaveBeenCalledTimes(6)
      expect(controlPTZ).toHaveBeenLastCalledWith(3, 7, { action: 'stop', direction: 3, speed: 1 })
    } finally {
      vi.useRealTimers()
    }
  })
})
