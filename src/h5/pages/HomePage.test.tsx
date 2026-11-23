import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomePage from './HomePage'
import { deviceTypeColor } from './home/deviceTypeColor'

vi.mock('@/hooks/session', () => ({
  useCompanyId: () => 3,
  useMe: () => ({ id: 1 }),
  useCurrentCompany: () => ({
    name: '智慧农业',
    companyId: 3,
    role: 'admin',
    status: 'active',
    expiredAt: null,
    logo: '',
  }),
  useMyCompanies: () => [{ name: '智慧农业', companyId: 3, accessible: true }],
}))
vi.mock('@shared/api/device', () => ({
  appDeviceSummaryQuery: () => ({
    queryKey: ['stats'],
    queryFn: async () => ({
      deviceCount: 100,
      siteCount: 4,
      deviceTypes: [
        { deviceTypeId: 1, count: 60 },
        { deviceTypeId: 2, count: 40 },
      ],
    }),
  }),
}))
vi.mock('@shared/api/site', () => ({ appSitesQuery: () => ({ queryKey: ['sites'], queryFn: async () => [] }) }))
vi.mock('@shared/api/alarm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/api/alarm')>()),
  scopedUnprocessedCountQuery: () => ({ queryKey: ['count'], queryFn: async () => ({ count: 2, capped: false }) }),
  alarmsQuery: () => ({ queryKey: ['alarms'], queryFn: async () => ({ records: [], hasMore: false }) }),
}))
let mockTypeName: (id: number) => string = (id: number) => (id === 1 ? '气象站' : '土壤站')
vi.mock('@shared/api/dict', () => ({
  useDeviceTypes: () => ({ nameOf: (id: number) => mockTypeName(id) }),
}))
afterEach(() => {
  cleanup()
  mockTypeName = (id: number) => (id === 1 ? '气象站' : '土壤站')
})
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
  it('显示类型分布，不显示欢迎语、顶栏和快捷按钮', async () => {
    setup()
    expect(screen.getByText('智慧农业')).toBeInTheDocument()
    expect(screen.getByText('管理员 · 正常 · 长期有效')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '企业资料 ›' })).toBeInTheDocument()
    expect(await screen.findByText('气象站')).toBeInTheDocument()
    expect(screen.queryByText('园区尽在掌握')).not.toBeInTheDocument()
    expect(screen.queryByText('智能物联网')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '我的账户' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '打开快捷入口' })).not.toBeInTheDocument()
    expect(screen.queryByText('远程控制')).not.toBeInTheDocument()
    expect(screen.getByText('土壤站')).toBeInTheDocument()
    expect(screen.getByText('气象站').closest('a')?.querySelector('i')).toHaveStyle({
      backgroundColor: deviceTypeColor(1),
    })
  })
})
