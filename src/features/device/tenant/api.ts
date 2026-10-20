import { api, companyHeader, type Schemas, unwrap } from '@/api/client'
import { fetchAllPages } from '@/api/page'
import type { PageParams } from '@/api/types'

export type DeviceTenantCreateBody = Schemas['DeviceTenantCreateBody']
export type MountedSite = Schemas['SiteMountedView']
export type AvailableSite = Schemas['SiteView']

export const tenantDeviceKeys = {
  all: (cid: number) => ['tenant', cid, 'devices'] as const,
  list: (cid: number) => ['tenant', cid, 'devices', 'list'] as const,
  sites: (cid: number, id: number) => ['tenant', cid, 'devices', id, 'sites'] as const,
}

/** 设备一次最多挂载的园区数 (PUT siteIds 上限) */
export const MAX_DEVICE_SITES = 200

/** 企业端设备接口 (FRONTEND_DESIGN §4.3)；配置相关接口见 config/api.ts tenantDeviceConfigApi */
export function tenantDeviceApi(cid: number) {
  const header = companyHeader(cid)
  const p = (id: number) => ({ params: { header, path: { id } } })
  const sites = (id: number, q: PageParams) =>
    unwrap(api.GET('/api/v1/tenant/devices/{id}/sites', { params: { header, path: { id }, query: q as never } }))
  return {
    list: (q: PageParams) => unwrap(api.GET('/api/v1/tenant/devices', { params: { header, query: q as never } })),
    create: (body: DeviceTenantCreateBody) => unwrap(api.POST('/api/v1/tenant/devices', { params: { header }, body })),
    /** 移出本企业：解除授权与本企业园区下的挂载，设备与配置保留 */
    remove: (ids: number[]) => unwrap(api.DELETE('/api/v1/tenant/devices', { params: { header }, body: { ids } })),

    sites,
    availableSites: (id: number, q: Partial<PageParams>) =>
      unwrap(
        api.GET('/api/v1/tenant/devices/{id}/sites/available', {
          params: { header, path: { id }, query: q as never },
        }),
      ),
    /** 设置挂载园区 (全集，按差异增删；空数组解除本企业全部挂载) */
    setSites: (id: number, siteIds: number[]) =>
      unwrap(api.PUT('/api/v1/tenant/devices/{id}/sites', { ...p(id), body: { siteIds } })),
    /** 当前挂载的全部园区 ID (修改前现取，保证全集基于最新数据) */
    mountedSiteIds: async (id: number) =>
      (await fetchAllPages((page, pageSize) => sites(id, { page, pageSize }))).map((s) => s.id),
  }
}

/** 在当前挂载集合上增删，得到要提交的全集 */
export function nextSiteIds(current: number[], add: number[] = [], remove: number[] = []): number[] {
  const drop = new Set(remove)
  return [...new Set([...current, ...add])].filter((id) => !drop.has(id))
}
