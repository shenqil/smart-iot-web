import { api, type Schemas, unwrap } from '@/api/client'
import { isApiError } from '@/api/errors'
import { useSession } from '@/stores/session'
import { FRONTEND_CONFIG_KEY, useSysConfig } from '@/stores/sysConfig'

export type SysConfig = Schemas['SysConfigView']

/** 按 key 获取系统配置 (通用接口，任意登录用户)；value 为 JSON 字符串 */
export const getSysConfig = (key: string) =>
  unwrap(api.GET('/api/v1/common/sys-configs/{key}', { params: { path: { key } } }))

let inflight: { token: string; promise: Promise<void> } | null = null

/**
 * 加载前端系统配置到 store (路由 loader 中随登录态一起调用，同一令牌只加载一次)。
 * 不抛异常：配置不存在 (404) 按默认值处理；其他失败记为 error，不阻塞进入系统，下次导航时重试。
 */
export function loadFrontendConfig({ force = false } = {}): Promise<void> {
  const { token } = useSession.getState()
  if (!token) return Promise.resolve()
  const state = useSysConfig.getState()
  if (!force && state.token === token && state.status === 'ready') return Promise.resolve()
  if (!force && inflight?.token === token) return inflight.promise

  state.setLoading(token)
  const promise = getSysConfig(FRONTEND_CONFIG_KEY)
    .then((r) => {
      if (useSession.getState().token === token) useSysConfig.getState().setFrontend(token, r?.value ?? null)
    })
    .catch((e) => {
      if (useSession.getState().token !== token) return
      if (isApiError(e) && e.status === 404) useSysConfig.getState().setFrontend(token, null)
      else useSysConfig.getState().setError(token)
    })
    .finally(() => {
      if (inflight?.promise === promise) inflight = null
    })
  inflight = { token, promise }
  return promise
}
