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
