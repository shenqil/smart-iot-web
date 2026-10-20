import { queryOptions } from '@tanstack/react-query'
import { api, companyHeader, unwrap } from '@/api/client'

/** 日环比：某天的整点值 (最多 24 行) */
export const dailyComparisonQuery = (companyId: number, deviceId: number, date: string) =>
  queryOptions({
    queryKey: ['app', companyId, 'devices', 'comparison', deviceId, 'daily', date],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/v1/app/devices/{id}/comparison/daily', {
          params: { path: { id: deviceId }, query: { date }, header: companyHeader(companyId) },
          signal,
        }),
      ),
    staleTime: 5 * 60_000,
  })

/** 月环比：某月的每日值 */
export const monthlyComparisonQuery = (companyId: number, deviceId: number, month: string) =>
  queryOptions({
    queryKey: ['app', companyId, 'devices', 'comparison', deviceId, 'monthly', month],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/v1/app/devices/{id}/comparison/monthly', {
          params: { path: { id: deviceId }, query: { month }, header: companyHeader(companyId) },
          signal,
        }),
      ),
    staleTime: 5 * 60_000,
  })
