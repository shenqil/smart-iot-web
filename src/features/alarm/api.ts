import { queryOptions } from '@tanstack/react-query'
import { api, companyHeader, unwrap } from '@/api/client'

/** 未处理告警总数 (顶栏数字)，60s 刷新；失败不打扰用户 */
export const unprocessedAlarmCountQuery = (companyId: number) =>
  queryOptions({
    queryKey: ['app', companyId, 'alarms', 'unprocessed-count'],
    queryFn: async () =>
      (
        await unwrap(
          api.GET('/api/v1/app/alarms', {
            params: { header: companyHeader(companyId), query: { processed: 'false', pageSize: 1 } },
          }),
        )
      ).totalCount,
    refetchInterval: 60_000,
    meta: { silent: true },
  })
