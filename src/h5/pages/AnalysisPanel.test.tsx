import type { AppDevice } from '@shared/api/device'
import { downloadHistory } from '@shared/telemetry/history'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BIZ_TZ, bizNow } from '@/lib/time'
import AnalysisPanel from './AnalysisPanel'

vi.mock('@shared/telemetry/history', () => ({
  downloadHistory: vi.fn(async () => ({ frames: 0, records: [] })),
  HISTORY_POINTS: 2000,
  toSeries: () => new Map(),
  mergeWindow: (_base: [number, number][], detail: [number, number][]) => detail,
}))
vi.mock('@shared/telemetry/history/historyWorker', () => ({
  HistoryWorker: class {
    async load() {
      return { count: 0 }
    }
    async sample() {
      return { series: [] }
    }
    terminate() {}
  },
}))
vi.mock('@shared/telemetry/comparison/api', () => ({
  dailyComparisonQuery: (_c: number, _d: number, date: string) => ({
    queryKey: ['day', date],
    queryFn: async () => ({ records: [] }),
  }),
  monthlyComparisonQuery: (_c: number, _d: number, month: string) => ({
    queryKey: ['month', month],
    queryFn: async () => ({ records: [] }),
  }),
}))
vi.mock('@/hooks/useECharts', () => ({ echarts: { connect: vi.fn() }, useECharts: () => ({ ref: { current: null } }) }))
const device = {
  id: 7,
  name: '温室',
  deviceSn: 'S7',
  sensors: [{ channel: 0, label: '温度', unit: '℃', resolution: 0.1, rangeMin: 0, rangeMax: 60 }],
} as unknown as AppDevice
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
function setup(mode: 'history' | 'comparison') {
  const router = createMemoryRouter(
    [{ path: '/h5/:companyId/devices', element: <AnalysisPanel device={device} mode={mode} /> }],
    { initialEntries: ['/h5/3/devices?deviceId=7'] },
  )
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}
describe('分析条件草稿', () => {
  it('编辑时间不会重新下载，取消保留已应用范围', async () => {
    const router = setup('history')
    await waitFor(() => expect(downloadHistory).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: '时间 / 通道 ›' }))
    await screen.findByLabelText('开始时间')
    fireEvent.change(screen.getByLabelText('开始时间'), {
      target: { value: bizNow().subtract(1, 'hour').format('YYYY-MM-DDTHH:mm') },
    })
    expect(router.state.location.search).toBe('?deviceId=7')
    fireEvent.click(screen.getByRole('button', { name: '关闭分析条件' }))
    expect(downloadHistory).toHaveBeenCalledTimes(1)
    expect(router.state.location.search).toBe('?deviceId=7')
  })
  it('确认后才应用时间并发起新查询', async () => {
    const router = setup('history')
    await waitFor(() => expect(downloadHistory).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: '时间 / 通道 ›' }))
    await screen.findByLabelText('开始时间')
    const start = bizNow().subtract(1, 'hour').format('YYYY-MM-DDTHH:mm')
    fireEvent.change(screen.getByLabelText('开始时间'), { target: { value: start } })
    fireEvent.click(screen.getByRole('button', { name: '应用条件' }))
    await waitFor(() => expect(downloadHistory).toHaveBeenCalledTimes(2))
    expect(new URLSearchParams(router.state.location.search).get('start')).toBe(start)
    expect(vi.mocked(downloadHistory).mock.lastCall?.[0].start).toContain('+08:00')
    expect(BIZ_TZ).toBe('Asia/Shanghai')
  })
  it('环比叠加切换只修改草稿，取消不改变 URL', async () => {
    const router = setup('comparison')
    fireEvent.click(screen.getByRole('button', { name: '时间 / 通道 ›' }))
    await screen.findByText('叠加前一天')
    fireEvent.click(screen.getByText('叠加前一天'))
    expect(router.state.location.search).toBe('?deviceId=7')
    fireEvent.click(screen.getByRole('button', { name: '关闭分析条件' }))
    expect(router.state.location.search).toBe('?deviceId=7')
  })
})
