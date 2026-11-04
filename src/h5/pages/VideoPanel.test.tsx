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
})
