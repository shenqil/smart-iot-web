import { queryOptions } from '@tanstack/react-query'
import { api, companyHeader, unwrap } from '@/api/client'

/** 未处理告警数 (顶栏数字，后端最多数到 1000，角标显示 99+)，60s 刷新；失败不打扰用户 */
export const unprocessedAlarmCountQuery = (companyId: number) =>
  queryOptions({
    queryKey: ['app', companyId, 'alarms', 'unprocessed-count'],
    queryFn: async () =>
      (
        await unwrap(
          api.GET('/api/v1/app/alarms/unprocessed-count', {
            params: { header: companyHeader(companyId) },
          }),
        )
      ).count,
    refetchInterval: 60_000,
    meta: { silent: true },
  })
