import { type LoaderFunctionArgs, redirect } from 'react-router'
import { isApiError } from '@/api/errors'
import { meQuery, myCompaniesQuery } from '@/features/auth/api'
import { loadFrontendConfig } from '@/features/sysconfig/api'
import { canEnter, landingPath, type Portal } from '@/lib/portal'
import { usePref } from '@/stores/pref'
import { hasValidSession, useSession } from '@/stores/session'
import { loginPath } from './navigation'
import { notify } from './notify'
import { queryClient } from './queryClient'

const pathOf = (request: Request) => {
  const u = new URL(request.url)
  return `${u.pathname}${u.search}`
}

/** 取当前登录态 (me + 我的企业)，并加载前端系统配置 (失败不阻塞)；未登录或令牌失效时跳登录页 */
export async function loadSession(request: Request) {
  if (!hasValidSession()) {
    useSession.getState().clear()
    throw redirect(loginPath(pathOf(request)))
  }
  try {
    const [me, companies] = await Promise.all([
      queryClient.ensureQueryData(meQuery),
      queryClient.ensureQueryData(myCompaniesQuery),
      loadFrontendConfig(),
    ])
    return { me, companies }
  } catch (e) {
    if (isApiError(e) && e.status === 401) {
      useSession.getState().clear()
      throw redirect(loginPath(pathOf(request)))
    }
    throw e
  }
}

export const rootLoader = ({ request }: LoaderFunctionArgs) => loadSession(request)

export const loginLoader = () => (hasValidSession() ? redirect('/') : null)

/** "/"：按落地规则跳转 */
export async function landingLoader({ request }: LoaderFunctionArgs) {
  const { me, companies } = await loadSession(request)
  const { lastPortal, lastCompanyId } = usePref.getState()
  return redirect(landingPath({ me, companies, lastPortal, lastCompanyId }))
}

export async function adminGuard({ request }: LoaderFunctionArgs) {
  const { me } = await loadSession(request)
  if (!canEnter('admin', me, [])) {
    notify.warning('没有平台管理权限')
    throw redirect('/')
  }
  usePref.getState().remember('admin', null)
  return null
}

/** 企业端 / 数据端 / 大屏：URL 中的企业必须满足进入条件 */
export function companyGuard(portal: Exclude<Portal, 'admin'>, rememberAs: Portal | null = portal) {
  return async ({ request, params }: LoaderFunctionArgs) => {
    const { me, companies } = await loadSession(request)
    const companyId = Number(params.companyId)
    if (!Number.isInteger(companyId) || !canEnter(portal, me, companies, companyId)) {
      notify.warning(
        portal === 'tenant' ? '无权管理该企业，或企业已停用 / 过期' : '无权访问该企业，或企业已停用 / 过期',
      )
      throw redirect('/')
    }
    if (rememberAs) usePref.getState().remember(rememberAs, companyId)
    return { companyId }
  }
}
