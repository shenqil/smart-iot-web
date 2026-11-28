import type { AppDevice } from '@shared/api/device'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MapPage from './MapPage'

const appSiteDevicesQuery = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/session', () => ({
  useCompanyId: () => 3,
  useMe: () => ({ id: 1 }),
}))
vi.mock('@/components/map/TdtMap', () => ({
  TdtMap: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('react-leaflet', () => ({
  Marker: ({ title, eventHandlers }: { title?: string; eventHandlers?: { click?: () => void } }) => (
    <button type="button" onClick={() => eventHandlers?.click?.()}>
      {title}
    </button>
  ),
  Polygon: () => null,
  Tooltip: () => null,
  useMap: () => ({
    getPane: () => ({ style: {} }),
    createPane: () => ({ style: {} }),
    fitBounds: () => {},
    setView: () => {},
  }),
}))
vi.mock('@shared/api/dict', () => ({
  useDeviceTypes: () => ({
    nameOf: () => '气象站',
    byId: new Map([[1, { name: '气象站', iconUrl: '' }]]),
  }),
}))
vi.mock('@shared/api/device', () => ({
  appSiteDevicesQuery: (...args: unknown[]) => appSiteDevicesQuery(...args),
}))

const sites = vi.hoisted(() => ({
  current: [] as {
    id: number
    name: string
    longitude: number | null
    latitude: number | null
    properties: Record<string, unknown>
  }[],
}))
const devices = vi.hoisted(() => ({ current: [] as AppDevice[] }))
const alarmDevices = vi.hoisted(() => ({ current: [] as { deviceId: number; count: number }[] }))

vi.mock('@shared/api/site', () => ({
  appSitesQuery: () => ({ queryKey: ['sites'], queryFn: async () => sites.current }),
}))
vi.mock('@shared/api/alarm', () => ({
  unprocessedAlarmCountsQuery: () => ({
    queryKey: ['alarms'],
    queryFn: async () => ({ sites: [{ siteId: 2, count: 1, devices: alarmDevices.current }] }),
  }),
}))

const device = (patch: Partial<AppDevice> & Pick<AppDevice, 'id' | 'name'>): AppDevice => ({
  coverImage: '',
  createdAt: '2026-01-01T00:00:00Z',
  createdBy: null,
  description: '',
  deviceSn: `SN${patch.id}`,
  deviceTypeId: 1,
  latitude: null,
  longitude: null,
  macAddress: '',
  online: true,
  readInterval: 60,
  relayChannels: 0,
  relays: [],
  sensorChannels: 0,
  sensors: [],
  simCard: '',
  status: 'active',
  updatedAt: '2026-01-01T00:00:00Z',
  ...patch,
})

const site = (id: number, name: string, longitude: number | null = null, latitude: number | null = null) => ({
  id,
  name,
  longitude,
  latitude,
  properties: {},
})

function renderPage(search = '') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[`/h5/3/map${search}`]}>
        <MapPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  sites.current = []
  devices.current = []
  alarmDevices.current = []
  appSiteDevicesQuery.mockReset()
})

describe('园区设备地图', () => {
  it('地址栏上的园区不存在时不改显示另一座园区', async () => {
    sites.current = [site(2, '东区')]
    devices.current = [device({ id: 8, name: '东区泵站', longitude: 120.1, latitude: 30.2 })]
    appSiteDevicesQuery.mockImplementation(() => ({
      queryKey: ['devices', 'unused'],
      queryFn: async () => devices.current,
    }))
    renderPage('?siteId=99')
    expect(await screen.findByText('没有这个园区')).toBeInTheDocument()
    expect(screen.queryByText('东区泵站')).not.toBeInTheDocument()
    expect(appSiteDevicesQuery).toHaveBeenCalledWith(3, 0, 100)
  })

  it('标点使用未处理告警数，没有坐标的设备仍列出并可进入告警', async () => {
    sites.current = [site(2, '东区', 120, 30)]
    devices.current = [
      device({ id: 8, name: '东区泵站', longitude: 120.1, latitude: 30.2 }),
      device({ id: 9, name: '库房', online: false }),
    ]
    alarmDevices.current = [{ deviceId: 8, count: 3 }]
    appSiteDevicesQuery.mockImplementation((_companyId: number, siteId: number, maxPages: number) => ({
      queryKey: ['devices', siteId, maxPages],
      queryFn: async () => devices.current,
    }))
    renderPage('?siteId=2')
    expect(await screen.findByRole('button', { name: '东区泵站 · 3 条未处理告警' })).toBeInTheDocument()
    expect(screen.getByText('库房')).toBeInTheDocument()
    expect(screen.getByText(/无坐标 1 台/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '东区泵站 · 3 条未处理告警' }))
    expect(screen.getAllByRole('link', { name: '查看设备告警 ›' }).map((link) => link.getAttribute('href'))).toContain(
      '/h5/3/alarms?deviceId=8&processed=false&siteId=2',
    )
    expect(screen.getAllByRole('link', { name: '查看设备详情 ›' }).map((link) => link.getAttribute('href'))).toContain(
      '/h5/3/devices?siteId=2&deviceId=9',
    )
  })

  it('设备都没有坐标、园区也没有中心点时说明原因', async () => {
    sites.current = [site(2, '东区')]
    devices.current = [device({ id: 9, name: '库房' })]
    appSiteDevicesQuery.mockImplementation((_companyId: number, siteId: number, maxPages: number) => ({
      queryKey: ['devices', siteId, maxPages],
      queryFn: async () => devices.current,
    }))
    renderPage('?siteId=2')
    expect(await screen.findByText('这些设备还没有坐标')).toBeInTheDocument()
    expect(screen.getByText('库房')).toBeInTheDocument()
  })
})
