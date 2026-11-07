import { queryOptions } from '@tanstack/react-query'
import { api, companyHeader, type Schemas, unwrap } from '@/api/client'
import { fetchAllPages } from '@/api/page'

export type AppDevice = Schemas['DeviceAppView']

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

export const appDeviceSummaryQuery = (companyId: number, siteId?: number) =>
  queryOptions({
    queryKey: ['app', companyId, 'devices', 'summary', siteId ?? null],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/v1/app/devices/summary', {
          params: { header: companyHeader(companyId), query: { siteId } },
          signal,
        }),
      ),
    refetchInterval: 30_000,
  })

export interface AppDeviceFilters {
  siteId?: number
  deviceTypeId?: number
  unclassified?: boolean
  keyword?: string
  page?: number
  pageSize?: number
}

/** 列表查询：按设备类型、未分类、园区或关键字筛选 */
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
