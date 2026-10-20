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
})
