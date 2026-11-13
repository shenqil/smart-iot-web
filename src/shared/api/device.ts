import { queryOptions } from '@tanstack/react-query'
import { api, companyHeader, type Schemas, unwrap } from '@/api/client'
import { fetchAllPages } from '@/api/page'

export type AppDevice = Schemas['AppDevice']
export type DeviceSummary = Schemas['AppDeviceSummary']

/** 数据端：某园区下全部设备 (含在线状态与通道配置)，30s 刷新在线状态 */
export const appSiteDevicesQuery = (companyId: number, siteId: number) =>
  queryOptions({
    queryKey: ['app', companyId, 'devices', 'site', siteId],
    queryFn: () =>
      fetchAllPages((page, pageSize) =>
        unwrap(
          api.GET('/api/v1/app/devices', {
            params: { header: companyHeader(companyId), query: { siteId, page, pageSize, sort: 'name' } },
          }),
        ),
      ),
    refetchInterval: 30_000,
  })

/** 整个企业的设备与园区数量 */
export const appDeviceSummaryQuery = (companyId: number) =>
  queryOptions({
    queryKey: ['app', companyId, 'devices', 'summary'],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/v1/app/devices/summary', {
          params: { header: companyHeader(companyId) },
          signal,
        }),
      ),
    refetchInterval: 30_000,
  })

/** 一座园区的设备数量 */
export const appSiteSummaryQuery = (companyId: number, siteId: number) =>
  queryOptions({
    queryKey: ['app', companyId, 'sites', siteId, 'summary'],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/v1/app/sites/{id}/summary', {
          params: { header: companyHeader(companyId), path: { id: siteId } },
          signal,
        }),
      ),
    refetchInterval: 30_000,
  })

export interface AppDeviceFilters {
  siteId?: number
  deviceTypeId?: number
  capability?: 'sensor' | 'relay' | 'camera'
  hasAlarm?: boolean
  keyword?: string
  page?: number
  pageSize?: number
  sort?: string
}

/** 列表查询：按设备类型、园区、能力或关键字筛选 */
export const appDevicesQuery = (companyId: number, filters: AppDeviceFilters = {}) =>
  queryOptions({
    queryKey: ['app', companyId, 'devices', 'list', filters],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/v1/app/devices', {
          params: { header: companyHeader(companyId), query: { page: 1, pageSize: 20, sort: 'name', ...filters } },
          signal,
        }),
      ),
    refetchInterval: 30_000,
  })
