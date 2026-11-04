import { api, type Schemas, unwrap } from '@/api/client'
import type { PageParams } from '@/api/types'

export type DeviceCreateBody = Schemas['DeviceCreateBody']
export type DeviceCompany = Schemas['DeviceCompanyView']
export type AvailableCompany = Schemas['DeviceCompanyView']

export const adminDeviceKeys = {
  all: ['admin', 0, 'devices'] as const,
  list: ['admin', 0, 'devices', 'list'] as const,
  companies: (id: number) => ['admin', 0, 'devices', id, 'companies'] as const,
}

export const adminDeviceApi = {
  list: (q: PageParams) => unwrap(api.GET('/api/v1/admin/devices', { params: { query: q as never } })),
  create: (body: DeviceCreateBody) => unwrap(api.POST('/api/v1/admin/devices', { body })),
  remove: (ids: number[]) => unwrap(api.DELETE('/api/v1/admin/devices', { body: { ids } })),
  batchCompanies: (deviceIds: number[], companyIds: number[], action: 'add' | 'remove') =>
    unwrap(api.POST('/api/v1/admin/devices/companies/batch', { body: { deviceIds, companyIds, action } })),
  companies: (id: number, q: PageParams) =>
    unwrap(api.GET('/api/v1/admin/devices/{id}/companies', { params: { path: { id }, query: q as never } })),
  availableCompanies: (id: number, q: Partial<PageParams>) =>
    unwrap(api.GET('/api/v1/admin/devices/{id}/companies/available', { params: { path: { id }, query: q as never } })),
  searchCompanies: (keyword: string) =>
    unwrap(
      api.GET('/api/v1/admin/companies', {
        params: { query: { keyword: keyword || undefined, pageSize: 20, sort: 'name' } },
      }),
    ),
}
