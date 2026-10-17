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
