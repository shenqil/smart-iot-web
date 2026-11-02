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
  online?: 'true' | 'false'
  keyword?: string
  page?: number
  pageSize?: number
}

/** 在线状态由服务在完整范围内筛选后分页，不能对当前页做本地过滤。 */
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
