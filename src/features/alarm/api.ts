import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api, companyHeader, type Schemas, unwrap } from '@/api/client'

export type AlarmView = Schemas['AlarmView']

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

/** 某个范围 (园区 / 设备，可按级别) 的未处理告警数 {count, capped}，60s 刷新 */
export const scopedUnprocessedCountQuery = (
  companyId: number,
  scope: { siteId?: number; deviceId?: number; level?: number },
) =>
  queryOptions({
    queryKey: ['app', companyId, 'alarms', 'unprocessed-count', scope],
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/app/alarms/unprocessed-count', {
          params: { header: companyHeader(companyId), query: scope },
        }),
      ),
    refetchInterval: 60_000,
    meta: { silent: true },
  })

export interface AlarmQuery {
  siteId?: number
  deviceId?: number
  level?: number
  type?: 'threshold_breach' | 'device_offline' | 'device_online' | 'device_fault'
  processed?: 'true' | 'false'
  start?: string
  end?: string
  keyword?: string
  sort?: string
  page: number
  pageSize: number
}

/** 告警列表 (不返回总数，hasMore 决定能否翻下一页)，60s 刷新 */
export const alarmsQuery = (companyId: number, q: AlarmQuery) =>
  queryOptions({
    queryKey: ['app', companyId, 'alarms', 'list', q],
    queryFn: ({ signal }) =>
      unwrap(api.GET('/api/v1/app/alarms', { params: { header: companyHeader(companyId), query: q }, signal })),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })

/** 批量处理告警 (已处理的忽略) → {affected} */
export const processAlarms = (companyId: number, ids: number[], remark: string) =>
  unwrap(
    api.POST('/api/v1/app/alarms/process', {
      params: { header: companyHeader(companyId) },
      body: { ids, remark: remark || undefined },
    }),
  )
