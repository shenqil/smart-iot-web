import type { AppDevice } from '@shared/api/device'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DeviceBookmarkCard, DeviceListItem } from './deviceCards'

const mock = vi.hoisted(() => ({ detail: vi.fn(), realtime: vi.fn() }))
vi.mock('@/hooks/session', () => ({ useCompanyId: () => 3 }))
vi.mock('./api', () => ({
  mobileDeviceQuery: () => ({ queryKey: ['detail'], queryFn: mock.detail, staleTime: Infinity }),
}))
vi.mock('@shared/telemetry/realtime/api', () => ({
  realtimeQuery: () => ({ queryKey: ['realtime'], queryFn: mock.realtime, staleTime: Infinity }),
}))
const device = {
  id: 1,
  name: '温室 A',
  online: false,
  status: 'active',
  deviceSn: 'A',
  sensors: [{ channel: 0, label: '温度', unit: '℃', resolution: 0.1, rangeMin: 0, rangeMax: 60 }],
  relays: [],
} as unknown as AppDevice
function setup(element: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(['detail'], device)
  qc.setQueryData(['realtime'], { online: true, sensors: [26.8] })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  )
  return qc
}
afterEach(cleanup)
beforeEach(() => {
  mock.detail.mockReset().mockResolvedValue(device)
  mock.realtime.mockReset().mockResolvedValue({ online: true, sensors: [26.8] })
})
describe('设备卡片数据状态', () => {
  it('详情刷新失败后停止显示缓存读数，避免失权后展示旧数据', async () => {
    const qc = setup(<DeviceBookmarkCard bookmark={{ id: 1, name: '温室 A' }} />)
    expect(screen.getByText('26.8')).toBeInTheDocument()
    mock.detail.mockRejectedValue(new Error('已撤销授权'))
    await act(async () => {
      await qc.refetchQueries({ queryKey: ['detail'] })
    })
    await waitFor(() => expect(screen.queryByText('26.8')).not.toBeInTheDocument())
    expect(qc.getQueryData(['detail'])).toEqual(device)
    expect(screen.getByText('暂不可用')).toBeInTheDocument()
  })
  it('列表状态跟随实时缓存，避免元数据离线但读数显示在线', async () => {
    const qc = setup(
      <DeviceListItem
        device={device}
        typeName="气象站"
        to="/h5/3/devices?deviceId=1"
        favorite={false}
        onFavorite={() => {}}
      />,
    )
    expect(screen.getByText('在线')).toBeInTheDocument()
    await act(async () => qc.setQueryData(['realtime'], { online: false, sensors: [26.8] }))
    await waitFor(() => expect(screen.getByText('离线')).toBeInTheDocument())
  })
})
