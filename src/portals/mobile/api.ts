import { queryOptions } from '@tanstack/react-query'
import { api, companyHeader, unwrap } from '@/api/client'
import type { AppDevice, AppDeviceFilters } from '@/features/device/api'

export interface DeviceFilters extends AppDeviceFilters {
  deviceId?: number
  capability?: 'sensor' | 'relay' | 'camera'
  hasAlarm?: boolean
}
export async function listDevices(companyId: number, filters: DeviceFilters, signal?: AbortSignal) {
  return unwrap(
    api.GET('/api/v1/app/devices', {
      params: { header: companyHeader(companyId), query: { page: 1, pageSize: 20, sort: 'name', ...filters } },
      signal,
    }),
  )
}
export const mobileDeviceQuery = (companyId: number, deviceId: number, siteId?: number) =>
  queryOptions({
    queryKey: ['app', companyId, 'devices', 'detail', deviceId, siteId ?? null],
    queryFn: async ({ signal }) => {
      if (siteId) {
        const page = await listDevices(companyId, { siteId, deviceId, pageSize: 1 }, signal)
        if (!page.records[0]) throw new Error('设备已移出当前园区，请重新选择')
        return page.records[0]
      }
      return unwrap(
        api.GET('/api/v1/app/devices/{id}', {
          params: { header: companyHeader(companyId), path: { id: deviceId } },
          signal,
        }),
      )
    },
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
        for (const d of data.records) {
          if (seen.has(d.id)) throw new Error('设备列表发生变化，请刷新后重试')
          seen.add(d.id)
          out.push(d)
        }
        if (out.length >= data.totalCount) return out
        if (!data.records.length) throw new Error('设备列表发生变化，请刷新后重试')
      }
      throw new Error('当前范围超过两万台设备，请选择单个园区查看')
    },
    staleTime: 30_000,
  })
