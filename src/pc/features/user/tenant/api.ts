import { api, companyHeader, type Schemas, unwrap } from '@/api/client'
import type { PageParams } from '@/api/types'

export type Member = Schemas['Member']
export type MemberCreateBody = Schemas['UserCreate']

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
    /** 批量解除企业成员关系 */
    remove: (ids: number[]) => unwrap(api.DELETE('/api/v1/tenant/users', { params: { header }, body: { ids } })),
  }
}
