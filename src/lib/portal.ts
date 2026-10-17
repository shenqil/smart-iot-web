import type { Schemas } from '@/api/client'

export type Portal = 'admin' | 'tenant' | 'app'
export type Me = Schemas['AuthProfile']
export type MyCompany = Schemas['AuthMyCompany']

export const PORTAL_LABEL: Record<Portal, string> = {
  admin: '平台管理',
  tenant: '企业管理',
  app: '数据使用',
}

/** 企业能否进入某端：tenant 需要 manageable，app 需要 accessible */
export function companyAllows(portal: Exclude<Portal, 'admin'>, c: MyCompany | undefined): boolean {
  if (!c) return false
  return portal === 'tenant' ? c.manageable : c.accessible
}

/** 企业不能进入某端的原因 (用于切换器置灰说明) */
export function companyDenyReason(portal: Exclude<Portal, 'admin'>, c: MyCompany): string | null {
  if (c.status !== 'active') return '已停用'
  if (!c.accessible) return '已过期'
  if (portal === 'tenant' && !c.manageable) return '非企业管理员'
  return null
}

export function canEnter(portal: Portal, me: Me, companies: MyCompany[], companyId?: number): boolean {
  if (portal === 'admin') return me.systemRole === 'admin'
  return companyAllows(
    portal,
    companies.find((c) => c.companyId === companyId),
  )
}

/** 当前用户可用的端 (按 平台 → 企业 → 数据 排序) */
export function availablePortals(me: Me, companies: MyCompany[]): Portal[] {
  const out: Portal[] = []
  if (me.systemRole === 'admin') out.push('admin')
  if (companies.some((c) => c.manageable)) out.push('tenant')
  if (companies.some((c) => c.accessible)) out.push('app')
  return out
}

/** 选择进入某端的企业：优先 preferId，其次第一个满足条件的企业 */
export function pickCompany(
  portal: Exclude<Portal, 'admin'>,
  companies: MyCompany[],
  preferId?: number | null,
): number | null {
  const prefer = companies.find((c) => c.companyId === preferId)
  if (prefer && companyAllows(portal, prefer)) return prefer.companyId
  return companies.find((c) => companyAllows(portal, c))?.companyId ?? null
}

export function portalHome(portal: Portal, companyId?: number | null): string {
  if (portal === 'admin') return '/admin'
  if (companyId == null) return '/no-company'
  return portal === 'tenant' ? `/tenant/${companyId}` : `/app/${companyId}/monitor`
}

/** 解析路径所属的端与企业 */
export function parsePortalPath(pathname: string): { portal: Portal | 'screen'; companyId: number | null } | null {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return { portal: 'admin', companyId: null }
  const m = /^\/(tenant|app|screen)\/(\d+)(?:\/|$)/.exec(pathname)
  if (!m) return null
  return { portal: m[1] as 'tenant' | 'app' | 'screen', companyId: Number(m[2]) }
}

/** redirect 目标是否允许当前用户访问 (防止登录后跳到无权限页面或站外) */
export function isPathAllowed(path: string, me: Me, companies: MyCompany[]): boolean {
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/login')) return false
  const pathname = path.split(/[?#]/)[0]
  if (pathname === '/account') return true
  const p = parsePortalPath(pathname)
  if (!p) return false
  const portal = p.portal === 'screen' ? 'app' : p.portal
  return canEnter(portal, me, companies, p.companyId ?? undefined)
}

export interface LandingInput {
  me: Me
  companies: MyCompany[]
  redirect?: string | null
  lastPortal?: Portal | null
  lastCompanyId?: number | null
}

/** 登录后落地 (FRONTEND_DESIGN §1.4) */
export function landingPath({ me, companies, redirect, lastPortal, lastCompanyId }: LandingInput): string {
  if (redirect && isPathAllowed(redirect, me, companies)) return redirect
  if (lastPortal && canEnter(lastPortal, me, companies, lastCompanyId ?? undefined)) {
    return portalHome(lastPortal, lastCompanyId)
  }
  if (me.systemRole === 'admin') return '/admin'
  const tenant = pickCompany('tenant', companies, lastCompanyId)
  if (tenant != null) return portalHome('tenant', tenant)
  const app = pickCompany('app', companies, lastCompanyId)
  if (app != null) return portalHome('app', app)
  return '/no-company'
}

/** 端切换器：切到目标端时沿用当前企业，不满足则取第一个满足的企业 */
export function switchPortalPath(target: Portal, companies: MyCompany[], currentCompanyId: number | null): string {
  if (target === 'admin') return '/admin'
  return portalHome(target, pickCompany(target, companies, currentCompanyId))
}
