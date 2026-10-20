import { queryOptions } from '@tanstack/react-query'
import { api, companyHeader, unwrap } from '@/api/client'

export const realtimeKey = (companyId: number, deviceId: number) =>
  ['app', companyId, 'devices', 'realtime', deviceId] as const

/** 设备实时数据，5s 轮询 (页面不可见时 TanStack Query 自动暂停)；失败在卡片区域内提示，不弹全局消息 */
export const realtimeQuery = (companyId: number, deviceId: number) =>
  queryOptions({
    queryKey: realtimeKey(companyId, deviceId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/v1/app/devices/{id}/realtime', {
          params: { path: { id: deviceId }, header: companyHeader(companyId) },
          signal,
        }),
      ),
    refetchInterval: 5_000,
    staleTime: 0,
    meta: { silent: true },
  })
