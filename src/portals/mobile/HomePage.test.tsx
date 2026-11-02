import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomePage from './HomePage'

vi.mock('@/hooks/session', () => ({
  useCompanyId: () => 3,
  useMe: () => ({ id: 1 }),
  useCurrentCompany: () => ({ name: '智慧农业', companyId: 3 }),
  useMyCompanies: () => [{ name: '智慧农业', companyId: 3, accessible: true }],
}))
vi.mock('@/features/device/api', () => ({
  appDeviceSummaryQuery: () => ({
    queryKey: ['stats'],
    queryFn: async () => ({
      deviceCount: 100,
      siteCount: 4,
      onlineCount: 80,
      offlineCount: 20,
      onlineKnown: true,
      unknownCount: 0,
      deviceTypes: [
        { deviceTypeId: 1, count: 60 },
        { deviceTypeId: 2, count: 40 },
      ],
    }),
  }),
}))
vi.mock('@/features/site/api', () => ({ appSitesQuery: () => ({ queryKey: ['sites'], queryFn: async () => [] }) }))
vi.mock('@/features/alarm/api', () => ({
  scopedUnprocessedCountQuery: () => ({ queryKey: ['count'], queryFn: async () => ({ count: 2, capped: false }) }),
  alarmsQuery: () => ({ queryKey: ['alarms'], queryFn: async () => ({ records: [], hasMore: false }) }),
}))
vi.mock('@/features/dict/api', () => ({
  useDeviceTypes: () => ({ nameOf: (id: number) => (id === 1 ? '气象站' : '土壤站') }),
}))
afterEach(cleanup)
function setup() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
describe('H5 首页', () => {
  it('显示全范围类型图表与在线率，默认仅显示拇指区快捷按钮', async () => {
    setup()
    expect(await screen.findByText('80.0%')).toBeInTheDocument()
    expect(screen.getByText('气象站')).toBeInTheDocument()
    expect(screen.getByText('土壤站')).toBeInTheDocument()
    expect(screen.queryByText('远程控制')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '打开快捷入口' }))
    expect(screen.getByText('远程控制')).toBeInTheDocument()
    expect(screen.queryByText('水肥一体化')).not.toBeInTheDocument()
  })
  it('向下滚隐藏、向上滚出现、滚到底出现', async () => {
    const { container } = setup()
    await screen.findByText('80.0%')
    const el = container.querySelector('.h5-scroll') as HTMLDivElement
    Object.defineProperties(el, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 400 },
    })
    const scroll = (y: number) => {
      Object.defineProperty(el, 'scrollTop', { configurable: true, writable: true, value: y })
      fireEvent.scroll(el)
    }
    await act(async () => {
      scroll(50)
      scroll(90)
    })
    expect(screen.queryByText('远程控制')).not.toBeInTheDocument()
    await act(async () => {
      scroll(70)
      scroll(40)
    })
    expect(screen.getByText('远程控制')).toBeInTheDocument()
    await act(async () => {
      scroll(100)
      scroll(150)
    })
    expect(screen.queryByText('远程控制')).not.toBeInTheDocument()
    await act(async () => scroll(600))
    expect(screen.getByText('远程控制')).toBeInTheDocument()
  })
})
