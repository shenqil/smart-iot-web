import { queryOptions } from '@tanstack/react-query'
import { api, companyHeader, type Schemas, unwrap } from '@/api/client'

export type CameraLive = Schemas['CameraLiveView']
export type PTZBody = Schemas['CameraPTZBody']

/**
 * 摄像头预览信息：萤石 ezopen 地址 + accessToken (后端换取并缓存，Secret 不出后端) + 云台能力，或直播地址
 * 播放器只在初始化时使用 token，页面停留期间不重新获取；错误在播放区域内提示
 */
export const cameraLiveQuery = (companyId: number, deviceId: number) =>
  queryOptions({
    queryKey: ['app', companyId, 'devices', 'camera', deviceId],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/v1/app/devices/{id}/camera/live', {
          params: { path: { id: deviceId }, header: companyHeader(companyId) },
          signal,
        }),
      ),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    retry: false,
    meta: { silent: true },
  })

/** 云台控制：按下 start、松开 stop (每个 start 都要有对应的 stop) */
export const controlPTZ = (companyId: number, deviceId: number, body: PTZBody) =>
  api.POST('/api/v1/app/devices/{id}/camera/ptz', {
    params: { path: { id: deviceId }, header: companyHeader(companyId) },
    body,
  })

/** 云台方向码 (萤石开放平台) */
export const PTZ = { UP: 0, DOWN: 1, LEFT: 2, RIGHT: 3, ZOOM_IN: 8, ZOOM_OUT: 9 } as const
