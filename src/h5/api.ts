import type { AppDevice, AppDeviceFilters } from '@shared/api/device'
import { queryOptions } from '@tanstack/react-query'
import { api, companyHeader, unwrap } from '@/api/client'

export interface DeviceFilters extends AppDeviceFilters {
  deviceId?: number
}
export async function listDevices(companyId: number, filters: DeviceFilters, signal?: AbortSignal) {
  const { deviceId: _deviceId, ...query } = filters
  const page = await unwrap(
    api.GET('/api/v1/app/devices', {
      params: { header: companyHeader(companyId), query: { page: 1, pageSize: 20, sort: 'name', ...query } },
      signal,
    }),
  )
  return { ...page, records: page.records ?? [] }
}
/** 当前企业资料。成员和管理员都能查看简介、规模和创建时间。 */
export const appCompanyQuery = (companyId: number) =>
  queryOptions({
    queryKey: ['app', companyId, 'company'],
    queryFn: ({ signal }) =>
      unwrap(api.GET('/api/v1/app/company', { params: { header: companyHeader(companyId) }, signal })),
    staleTime: 60_000,
  })

/** 企业管理端的企业详情。线上尚未发布用户端接口时，管理员用它补齐简介和联系方式。 */
export const manageableCompanyQuery = (companyId: number) =>
  queryOptions({
    queryKey: ['tenant', companyId, 'company'],
    queryFn: ({ signal }) =>
      unwrap(api.GET('/api/v1/tenant/company', { params: { header: companyHeader(companyId) }, signal })),
    staleTime: 60_000,
  })

export const mobileDeviceQuery = (companyId: number, deviceId: number, siteId?: number) =>
  queryOptions({
    queryKey: ['app', companyId, 'devices', 'detail', deviceId, siteId ?? null],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/v1/app/devices/{id}', {
          params: { header: companyHeader(companyId), path: { id: deviceId } },
          signal,
        }),
      ),
    staleTime: 30_000,
  })
/** 全量场景明确拒绝超过上限，不能悄悄返回部分设备并当成全部。 */
export const mapDevicesQuery = (companyId: number, siteId?: number) =>
  queryOptions({
    queryKey: ['app', companyId, 'devices', 'map', siteId ?? null],
    queryFn: async ({ signal }) => {
      const out: AppDevice[] = [],
        seen = new Set<number>()
      for (let page = 1; page <= 100; page++) {
        const data = await listDevices(companyId, { siteId, page, pageSize: 200 }, signal)
        for (const d of data.records ?? []) {
          if (seen.has(d.id)) throw new Error('设备列表发生变化，请刷新后重试')
          seen.add(d.id)
          out.push(d)
        }
        if (out.length >= data.totalCount) return out
        if (!data.records?.length) throw new Error('设备列表发生变化，请刷新后重试')
      }
      throw new Error('当前范围超过两万台设备，请选择单个园区查看')
    },
    staleTime: 30_000,
  })
