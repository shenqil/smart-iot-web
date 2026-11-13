import { queryOptions } from '@tanstack/react-query'
import { api, companyHeader, unwrap } from '@/api/client'

/** 日环比：某天的整点值 (最多 24 行) */
export const dailyComparisonQuery = (companyId: number, deviceSn: string, date: string) =>
  queryOptions({
    queryKey: ['app', companyId, 'devices', 'comparison', deviceSn, 'daily', date],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/v1/app/devices/{deviceSn}/comparison/daily', {
          params: { path: { deviceSn }, query: { date }, header: companyHeader(companyId) },
          signal,
        }),
      ),
    staleTime: 5 * 60_000,
  })

/** 月环比：某月的每日值 */
export const monthlyComparisonQuery = (companyId: number, deviceSn: string, month: string) =>
  queryOptions({
    queryKey: ['app', companyId, 'devices', 'comparison', deviceSn, 'monthly', month],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/v1/app/devices/{deviceSn}/comparison/monthly', {
          params: { path: { deviceSn }, query: { month }, header: companyHeader(companyId) },
          signal,
        }),
      ),
    staleTime: 5 * 60_000,
  })
