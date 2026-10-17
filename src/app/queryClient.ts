import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { COMPANY_DENIED_CODES, errorText, isApiError, NETWORK_ERROR } from '@/api/errors'
import { authKeys } from '@/features/auth/keys'
import { useSession } from '@/stores/session'
import { currentPath, loginPath, navigateTo } from './navigation'
import { notify } from './notify'

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: { silent?: boolean }
    mutationMeta: { silent?: boolean }
  }
}

/** 会话失效：清理并跳登录页 (并发多个 401 只处理一次) */
export function expireSession(message = '登录已过期，请重新登录') {
  if (!useSession.getState().token) return
  const redirect = currentPath()
  useSession.getState().clear()
  notify.warning(message)
  navigateTo(loginPath(redirect), { replace: true })
  setTimeout(() => queryClient.clear(), 0)
}

let companyDeniedOpen = false

/** 全局错误处理 (FRONTEND_DESIGN §2.5) */
export function handleGlobalError(error: unknown, silent?: boolean) {
  if (isApiError(error)) {
    if (error.status === 401) return expireSession()
    if (COMPANY_DENIED_CODES.has(error.code)) {
      queryClient.invalidateQueries({ queryKey: authKeys.companies })
      if (companyDeniedOpen) return
      companyDeniedOpen = true
      notify.modal()?.warning({
        title: '当前企业不可用',
        content: error.message,
        okText: '返回首页',
        onOk: () => navigateTo('/', { replace: true }),
        afterClose: () => {
          companyDeniedOpen = false
        },
      })
      return
    }
  }
  if (!silent) notify.error(errorText(error))
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => handleGlobalError(error, query.meta?.silent),
  }),
  mutationCache: new MutationCache({
    onError: (error, _v, _c, mutation) => handleGlobalError(error, mutation.meta?.silent),
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // 只对网络错误与 5xx 重试 1 次
      retry: (count, error) => count < 1 && isApiError(error) && (error.code === NETWORK_ERROR || error.status >= 500),
    },
    mutations: { retry: false },
  },
})
