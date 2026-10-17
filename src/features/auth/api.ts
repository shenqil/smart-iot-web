import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/api/client'
import { navigateTo } from '@/app/navigation'
import { queryClient } from '@/app/queryClient'
import { useSession } from '@/stores/session'
import { authKeys } from './keys'

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

/** 退出登录：通知后端使当前令牌失效 (失败也继续清理本地)，并跳到登录页 */
export async function logout() {
  try {
    await api.POST('/api/v1/auth/logout')
  } catch {
    // 令牌已失效等情况忽略
  }
  useSession.getState().clear()
  navigateTo('/login', { replace: true })
  // 等登录页渲染后再清缓存，避免仍挂载的页面因缓存清空重新请求
  setTimeout(() => queryClient.clear(), 0)
}
