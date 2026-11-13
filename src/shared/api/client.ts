import createClient, { type Middleware } from 'openapi-fetch'
import { queryClient } from '@/app/queryClient'
import { useSession } from '@/stores/session'
import { authKeys } from './authKeys'
import { ApiError, NETWORK_ERROR } from './errors'
import type { components, paths } from './schema'

export type Schemas = components['schemas']

/** 同源请求，由 Vite / Nginx 代理 /api 到后端 */
export const api = createClient<paths>({ baseUrl: '' })

const auth: Middleware = {
  onRequest({ request }) {
    const { token } = useSession.getState()
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
    const path = new URL(request.url).pathname
    if (path.startsWith('/api/v1/admin/')) {
      const profile = queryClient.getQueryData<Schemas['Profile']>(authKeys.me)
      if (profile) request.headers.set('X-System-Role', profile.systemRole)
    } else if (path.startsWith('/api/v1/tenant/') || path.startsWith('/api/v1/app/')) {
      const companyId = Number(request.headers.get('X-Company-ID'))
      const companies = queryClient.getQueryData<Schemas['MyCompany'][]>(authKeys.companies)
      const role = companies?.find((company) => company.companyId === companyId)?.role
      if (role) request.headers.set('X-Company-Role', role)
    }
    return request
  },
}

const errors: Middleware = {
  async onResponse({ response }) {
    if (response.ok) return response
    const body = await response
      .clone()
      .json()
      .catch(() => ({}))
    throw new ApiError(
      response.status,
      body.code ?? 'UNKNOWN',
      body.message ?? `请求失败 (${response.status})`,
      body.details ?? [],
      response.headers.get('X-Request-ID'),
    )
  },
  onError({ error }) {
    if (error instanceof ApiError) return error
    if (error instanceof DOMException && error.name === 'AbortError') return error
    return new ApiError(0, NETWORK_ERROR, '网络异常', [], null)
  },
}

api.use(auth, errors)

/** 取出 openapi-fetch 结果中的 data (失败已由中间件抛出 ApiError) */
export async function unwrap<T>(p: Promise<{ data?: T }>): Promise<T> {
  const { data } = await p
  return data as T
}

/** 企业管理端 / 数据使用端接口的企业头：companyId 来自当前路由 */
export const companyHeader = (companyId: number) => ({ 'X-Company-ID': companyId })
