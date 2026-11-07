import type { AppDevice } from '@shared/api/device'
import { controlRelay, relayLinksKey } from '@shared/api/relay'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Dialog, Toast } from 'antd-mobile'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RelayPanel from './RelayPanel'

vi.mock('@shared/api/relay', async (orig) => ({
  ...(await orig<typeof import('@/features/relay/api')>()),
  controlRelay: vi.fn(),
}))
const device = {
  id: 7,
  name: '水泵',
  online: true,
  status: 'active',
  readInterval: 60,
  sensors: [],
  relays: [{ channel: 0, label: '灌溉泵', standardName: '泵' }],
} as unknown as AppDevice
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
beforeEach(() => {
  vi.spyOn(Toast, 'show').mockReturnValue({ close: vi.fn() } as never)
})
function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(relayLinksKey(3, 7), [])
  const router = createMemoryRouter(
    [
      {
        path: '/h5/:companyId',
        element: <RelayPanel device={device} realtime={{ online: true, relays: [0] } as never} />,
      },
    ],
    { initialEntries: ['/h5/3'] },
  )
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return qc
}
describe('移动继电器确认与设备回报', () => {
  it('确认弹窗期间同通道只能进入一次；取消不发命令', async () => {
    let answer!: (b: boolean) => void
    const confirm = vi.spyOn(Dialog, 'confirm').mockImplementation(
      () =>
        new Promise((r) => {
          answer = r
        }),
    )
    setup()
    await act(async () => {
      fireEvent.click(screen.getByRole('switch'))
      fireEvent.click(screen.getByRole('switch'))
    })
    expect(confirm).toHaveBeenCalledTimes(1)
    await act(async () => answer(false))
    expect(controlRelay).not.toHaveBeenCalled()
  })
  it('命令未确认之前不显示已开启，超时也不乐观改变状态', async () => {
    vi.spyOn(Dialog, 'confirm').mockResolvedValue(true)
    let respond!: (v: unknown) => void
    vi.mocked(controlRelay).mockImplementation(
      () =>
        new Promise((r) => {
          respond = r as never
        }),
    )
    setup()
    await act(async () => fireEvent.click(screen.getByRole('switch')))
    expect(screen.getByText('通道 0 · 已关闭')).toBeInTheDocument()
    await act(async () => respond({ status: 'timeout', actualState: null }))
    expect(screen.getByText('通道 0 · 已关闭')).toBeInTheDocument()
    expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({ content: '设备未应答，结果未知' }))
  })
})
