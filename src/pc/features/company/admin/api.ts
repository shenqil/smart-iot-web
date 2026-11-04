import { queryOptions } from '@tanstack/react-query'
import { api, type Schemas, unwrap } from '@/api/client'
import type { PageResult } from '@/api/page'
import type { PageParams } from '@/api/types'

export type Company = Schemas['CompanyView']
export type CompanyDetail = Schemas['CompanyDetailView']
export type CompanyBody = Schemas['CompanyBody']
/** 修改企业 (部分更新：未传的字段不修改；expiredAt 传 null 表示不过期) */
export type CompanyUpdateBody = Schemas['CompanyUpdateBody']
export type Member = Schemas['UserMemberView']
export type UserRow = Schemas['UserView']
export type DeviceRow = Schemas['DeviceView']
export type SiteRow = Schemas['SiteView']

export const companyKeys = {
  all: ['admin', 0, 'companies'] as const,
  list: ['admin', 0, 'companies', 'list'] as const,
  detail: (id: number) => ['admin', 0, 'companies', 'detail', id] as const,
  members: (id: number) => ['admin', 0, 'companies', id, 'members'] as const,
  devices: (id: number) => ['admin', 0, 'companies', id, 'devices'] as const,
  sites: (id: number) => ['admin', 0, 'companies', id, 'sites'] as const,
}

const p = (id: number) => ({ params: { path: { id } } })

export const companyApi = {
  list: (q: PageParams) => unwrap(api.GET('/api/v1/admin/companies', { params: { query: q as never } })),
  detail: (id: number) =>
    queryOptions({
      queryKey: companyKeys.detail(id),
      queryFn: () => unwrap(api.GET('/api/v1/admin/companies/{id}', p(id))),
    }),
  create: (body: CompanyBody) => unwrap(api.POST('/api/v1/admin/companies', { body })),
  update: (id: number, body: CompanyUpdateBody) => unwrap(api.PUT('/api/v1/admin/companies/{id}', { ...p(id), body })),
  remove: (ids: number[]) => unwrap(api.DELETE('/api/v1/admin/companies', { body: { ids } })),

  members: (id: number, q: PageParams) =>
    unwrap(api.GET('/api/v1/admin/companies/{id}/members', { params: { path: { id }, query: q as never } })),
  availableUsers: (id: number, q: Partial<PageParams>) =>
    unwrap(api.GET('/api/v1/admin/companies/{id}/members/available', { params: { path: { id }, query: q as never } })),
  assignMembers: (id: number, members: { userId: number; role: 'admin' | 'user' }[]) =>
    unwrap(api.PUT('/api/v1/admin/companies/{id}/members', { ...p(id), body: { members } })),
  removeMembers: (id: number, userIds: number[]) =>
    unwrap(api.DELETE('/api/v1/admin/companies/{id}/members', { ...p(id), body: { userIds } })),
  /** 修改某用户在企业中的角色 */
  setRole: (companyId: number, userId: number, role: 'admin' | 'user') =>
    unwrap(
      api.PUT('/api/v1/admin/users/{id}/companies/{companyId}', {
        params: { path: { id: userId, companyId } },
        body: { role },
      }),
    ),

  devices: (id: number, q: PageParams) =>
    unwrap(api.GET('/api/v1/admin/companies/{id}/devices', { params: { path: { id }, query: q as never } })),
  availableDevices: (id: number, q: Partial<PageParams>) =>
    unwrap(api.GET('/api/v1/admin/companies/{id}/devices/available', { params: { path: { id }, query: q as never } })),
  /** 批量授权 / 撤销 (设备 × 企业) */
  batchDevices: (deviceIds: number[], companyIds: number[], action: 'add' | 'remove') =>
    unwrap(api.POST('/api/v1/admin/devices/companies/batch', { body: { deviceIds, companyIds, action } })),

  sites: (id: number, q: PageParams) =>
    unwrap(api.GET('/api/v1/admin/companies/{id}/sites', { params: { path: { id }, query: q as never } })) as Promise<
      PageResult<SiteRow>
    >,
}
