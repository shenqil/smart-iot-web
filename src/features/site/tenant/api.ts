import { queryOptions } from '@tanstack/react-query'
import { api, companyHeader, type Schemas, unwrap } from '@/api/client'
import { fetchAllPages } from '@/api/page'
import type { PageParams } from '@/api/types'
import { useCompanyId } from '@/hooks/session'

export type Site = Schemas['SiteView']
export type SiteDetail = Schemas['SiteDetailView']
export type SiteBody = Schemas['SiteBody']
/** 修改园区 (部分更新：未传不修改；经纬度成对传 null 清除；images 传值即整体替换) */
export type SiteUpdateBody = Schemas['SiteUpdateBody']
export type SiteDevice = Schemas['DeviceView']
export type SiteStatus = Site['status']

export const tenantSiteKeys = {
  all: (cid: number) => ['tenant', cid, 'sites'] as const,
  list: (cid: number) => ['tenant', cid, 'sites', 'list'] as const,
  /** 全部园区 (下拉选项、概览地图) */
  options: (cid: number) => ['tenant', cid, 'sites', 'options'] as const,
  detail: (cid: number, id: number) => ['tenant', cid, 'sites', 'detail', id] as const,
  devices: (cid: number, id: number) => ['tenant', cid, 'sites', id, 'devices'] as const,
}

/** 企业端园区接口 (FRONTEND_DESIGN §4.2)；企业头取自路由 */
export function tenantSiteApi(cid: number) {
  const header = companyHeader(cid)
  const p = (id: number) => ({ params: { header, path: { id } } })
  return {
    list: (q: PageParams) => unwrap(api.GET('/api/v1/tenant/sites', { params: { header, query: q as never } })),
    detail: (id: number) => unwrap(api.GET('/api/v1/tenant/sites/{id}', p(id))),
    create: (body: SiteBody) => unwrap(api.POST('/api/v1/tenant/sites', { params: { header }, body })),
    update: (id: number, body: SiteUpdateBody) => unwrap(api.PUT('/api/v1/tenant/sites/{id}', { ...p(id), body })),
    remove: (ids: number[]) => unwrap(api.DELETE('/api/v1/tenant/sites', { params: { header }, body: { ids } })),

    devices: (id: number, q: PageParams) =>
      unwrap(api.GET('/api/v1/tenant/sites/{id}/devices', { params: { header, path: { id }, query: q as never } })),
    availableDevices: (id: number, q: Partial<PageParams>) =>
      unwrap(
        api.GET('/api/v1/tenant/sites/{id}/devices/available', {
          params: { header, path: { id }, query: q as never },
        }),
      ),
    mount: (id: number, deviceIds: number[]) =>
      unwrap(api.POST('/api/v1/tenant/sites/{id}/devices', { ...p(id), body: { deviceIds } })),
    unmount: (id: number, deviceIds: number[]) =>
      unwrap(api.DELETE('/api/v1/tenant/sites/{id}/devices', { ...p(id), body: { deviceIds } })),
  }
}

export const useTenantSiteApi = () => tenantSiteApi(useCompanyId())

export const tenantSiteDetailQuery = (cid: number, id: number) =>
  queryOptions({ queryKey: tenantSiteKeys.detail(cid, id), queryFn: () => tenantSiteApi(cid).detail(id) })

/** 本企业全部园区 (按名称)，供下拉与地图使用 */
export const tenantSitesAllQuery = (cid: number) =>
  queryOptions({
    queryKey: tenantSiteKeys.options(cid),
    queryFn: () => fetchAllPages((page, pageSize) => tenantSiteApi(cid).list({ page, pageSize, sort: 'name' })),
    staleTime: 60_000,
  })
