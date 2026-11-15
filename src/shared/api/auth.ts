import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/api/client'
import { loginPath, navigateTo } from '@/app/navigation'
import { queryClient } from '@/app/queryClient'
import { useSession } from '@/stores/session'
import { authKeys } from './authKeys'

export { authKeys }

export const meQuery = queryOptions({
  queryKey: authKeys.me,
  queryFn: () => unwrap(api.GET('/api/v1/auth/me')),
  staleTime: 5 * 60_000,
})

export const myCompaniesQuery = queryOptions({
  queryKey: authKeys.companies,
  queryFn: async () => (await unwrap(api.GET('/api/v1/auth/companies'))) ?? [],
  staleTime: 5 * 60_000,
})

/** 登录：保存令牌并预填 me 缓存 */
export async function login(username: string, password: string) {
  const r = await unwrap(api.POST('/api/v1/auth/login', { body: { username, password } }))
  queryClient.clear()
  useSession.getState().setSession(r.token, r.expiresAt)
  if (r.user) queryClient.setQueryData(authKeys.me, r.user)
  return r
}

let logoutPromise: Promise<void> | null = null

/** 退出登录：吊销后端令牌、清理本地会话并跳到登录页（并发调用复用同一流程） */
export function logout(): Promise<void> {
  if (logoutPromise) return logoutPromise
  const p = (async () => {
    if (useSession.getState().token) {
      try {
        await api.POST('/api/v1/auth/logout', { signal: AbortSignal.timeout(3000) })
      } catch {
        // 网络异常或令牌已失效时仍继续清理本地会话
      }
    }
    useSession.getState().clear()
    navigateTo(loginPath(), { replace: true })
    // 等登录页渲染后再清缓存，避免仍挂载的页面因缓存清空重新请求
    setTimeout(() => queryClient.clear(), 0)
  })().finally(() => {
    logoutPromise = null
  })
  logoutPromise = p
  return p
}
