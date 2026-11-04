import { api, companyHeader, type Schemas, unwrap } from '@/api/client'
import type { PageParams } from '@/api/types'

export type Member = Schemas['UserMemberView']
export type MemberCreateBody = Schemas['UserTenantCreateBody']

export const tenantUserKeys = {
  all: (cid: number) => ['tenant', cid, 'users'] as const,
  list: (cid: number) => ['tenant', cid, 'users', 'list'] as const,
  detail: (cid: number, id: number) => ['tenant', cid, 'users', 'detail', id] as const,
}

/** 企业端成员接口 (FRONTEND_DESIGN §4.4)：没有编辑、重置密码、改角色 (后端不提供) */
export function tenantUserApi(cid: number) {
  const header = companyHeader(cid)
  return {
    list: (q: PageParams) => unwrap(api.GET('/api/v1/tenant/users', { params: { header, query: q as never } })),
    detail: (id: number) => unwrap(api.GET('/api/v1/tenant/users/{id}', { params: { header, path: { id } } })),
    /** 创建用户：自动以 user 角色加入本企业 */
    create: (body: MemberCreateBody) => unwrap(api.POST('/api/v1/tenant/users', { params: { header }, body })),
    /** 批量移出：只能移出 user 角色；含管理员或自己时整批拒绝 */
    remove: (ids: number[]) => unwrap(api.DELETE('/api/v1/tenant/users', { params: { header }, body: { ids } })),
  }
}

/** 可被企业管理员移出：普通成员且不是自己 */
export const canRemoveMember = (m: Pick<Member, 'id' | 'role'>, meId: number) => m.role === 'user' && m.id !== meId
