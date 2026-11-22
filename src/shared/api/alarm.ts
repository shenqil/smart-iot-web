import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api, companyHeader, type Schemas, unwrap } from '@/api/client'
import { currentOperatorName } from '@/lib/operator'

export type AlarmView = Schemas['AppAlarm']

/** 未处理告警数 (顶栏数字，后端最多数到 1000)，60s 刷新；失败不打扰用户 */
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

/**
 * 未处理告警普查。每台设备最多 100，园区数是设备数之和。
 * siteId 只统计这一座园区；levels 为 true 时每个园区带上四级。不带 siteId 时 60s 刷新，带上时 30s。
 */
export const unprocessedAlarmCountsQuery = (
  companyId: number,
  scope: { siteId?: number; levels?: boolean } = {},
) =>
  queryOptions({
    queryKey: ['app', companyId, 'alarms', 'unprocessed-counts', scope.siteId ?? 0, scope.levels ? 1 : 0],
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/app/alarms/unprocessed-counts', {
          params: {
            header: companyHeader(companyId),
            query: {
              ...(scope.siteId ? { siteId: scope.siteId } : {}),
              ...(scope.levels ? { levels: true } : {}),
            },
          },
        }),
      ),
    refetchInterval: scope.siteId ? 30_000 : 60_000,
    meta: { silent: true },
  })

/** 普查条数：到 100 即上限，超过 99 显示 99+ */
export const formatCensusCount = (count: number) => formatUnprocessedCount({ count, capped: count >= 100 })

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

/** 格式化未处理告警数 (超过 99 或后端达到上限 capped=true 时统一显示 99+) */
export const formatUnprocessedCount = (c: { count: number; capped: boolean }) =>
  c.capped || c.count > 99 ? '99+' : String(c.count)

export interface AlarmQuery {
  siteId?: number
  deviceId?: number
  level?: number
  type?: AlarmView['type']
  processed?: 'true' | 'false'
  start?: string
  end?: string
  keyword?: string
  /** 时间序位置。不传从最新一条开始 */
  cursor?: string
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
      body: { ids, operatorName: currentOperatorName(50), remark: remark || undefined },
    }),
  )

/** 支持详情刷新/深链接；按当前企业及启用园区定位告警。 */
export const alarmDetailQuery = (companyId: number, alarmId: number) =>
  queryOptions({
    queryKey: ['app', companyId, 'alarms', 'detail', alarmId],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/v1/app/alarms/{id}', {
          params: { header: companyHeader(companyId), path: { id: alarmId } },
          signal,
        }),
      ),
  })
