import { queryOptions } from '@tanstack/react-query'
import { api, companyHeader, unwrap } from '@/api/client'

export const realtimeKey = (companyId: number, deviceSn: string) =>
  ['app', companyId, 'devices', 'realtime', deviceSn] as const

/** 设备实时数据，5s 轮询 (页面不可见时 TanStack Query 自动暂停)；失败在卡片区域内提示，不弹全局消息 */
export const realtimeQuery = (companyId: number, deviceSn: string) =>
  queryOptions({
    queryKey: realtimeKey(companyId, deviceSn),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/v1/app/devices/{deviceSn}/realtime', {
          params: { path: { deviceSn }, header: companyHeader(companyId) },
          signal,
        }),
      ),
    refetchInterval: 5_000,
    staleTime: 0,
    meta: { silent: true },
  })
