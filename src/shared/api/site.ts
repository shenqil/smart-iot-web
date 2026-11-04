import { queryOptions } from '@tanstack/react-query'
import { api, companyHeader, type Schemas, unwrap } from '@/api/client'
import { fetchAllPages } from '@/api/page'

export type SiteView = Schemas['SiteView']

/** 数据端：本企业全部园区 */
export const appSitesQuery = (companyId: number) =>
  queryOptions({
    queryKey: ['app', companyId, 'sites', 'all'],
    queryFn: () =>
      fetchAllPages((page, pageSize) =>
        unwrap(
          api.GET('/api/v1/app/sites', {
            params: { header: companyHeader(companyId), query: { page, pageSize, sort: 'name' } },
          }),
        ),
      ),
    staleTime: 60_000,
  })

/** 园区天气 (按坐标)；天气服务未配置或不可用 (503) 时静默隐藏 */
export const weatherQuery = (lat: number, lng: number) =>
  queryOptions({
    queryKey: ['common', 'weather', lat, lng],
    queryFn: () => unwrap(api.GET('/api/v1/common/weather', { params: { query: { lat, lng } } })),
    staleTime: 10 * 60_000,
    retry: false,
    meta: { silent: true },
  })
