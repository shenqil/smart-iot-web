import { queryOptions } from '@tanstack/react-query'
import { api, type Schemas, unwrap } from '@/api/client'
import type { PageParams } from '@/api/types'

export type User = Schemas['UserView']
export type UserDetail = Schemas['UserDetailView']
export type UserCreateBody = Schemas['UserCreateBody']
export type UserUpdateBody = Schemas['UserUpdateBody']
export type Membership = Schemas['UserMembershipView']
export type CompanyRole = 'admin' | 'user'

export const userKeys = {
  all: ['admin', 0, 'users'] as const,
  list: ['admin', 0, 'users', 'list'] as const,
  detail: (id: number) => ['admin', 0, 'users', 'detail', id] as const,
  memberships: (id: number) => ['admin', 0, 'users', id, 'companies'] as const,
}

const p = (id: number) => ({ params: { path: { id } } })

export const userApi = {
  list: (q: PageParams) => unwrap(api.GET('/api/v1/admin/users', { params: { query: q as never } })),
  detail: (id: number) =>
    queryOptions({ queryKey: userKeys.detail(id), queryFn: () => unwrap(api.GET('/api/v1/admin/users/{id}', p(id))) }),
  create: (body: UserCreateBody) => unwrap(api.POST('/api/v1/admin/users', { body })),
  update: (id: number, body: UserUpdateBody) => unwrap(api.PUT('/api/v1/admin/users/{id}', { ...p(id), body })),
  resetPassword: (id: number, password: string) =>
    unwrap(api.PUT('/api/v1/admin/users/{id}/password', { ...p(id), body: { password } })),
  remove: (ids: number[]) => unwrap(api.DELETE('/api/v1/admin/users', { body: { ids } })),

  memberships: (id: number, q: PageParams) =>
    unwrap(api.GET('/api/v1/admin/users/{id}/companies', { params: { path: { id }, query: q as never } })),
  setRole: (userId: number, companyId: number, role: CompanyRole) =>
    unwrap(
      api.PUT('/api/v1/admin/users/{id}/companies/{companyId}', {
        params: { path: { id: userId, companyId } },
        body: { role },
      }),
    ),
  leave: (userId: number, companyIds: number[]) =>
    unwrap(api.DELETE('/api/v1/admin/users/{id}/companies', { ...p(userId), body: { companyIds } })),
  /** 加入企业：复用企业侧的"分配成员"接口 */
  join: (userId: number, companyId: number, role: CompanyRole) =>
    unwrap(api.PUT('/api/v1/admin/companies/{id}/members', { ...p(companyId), body: { members: [{ userId, role }] } })),
  searchCompanies: (keyword: string) =>
    unwrap(
      api.GET('/api/v1/admin/companies', {
        params: { query: { keyword: keyword || undefined, pageSize: 20, sort: 'name' } },
      }),
    ),
}

/** 密码规则：8~64 位，同时包含字母和数字 (与后端一致) */
export const PASSWORD_RULES = [
  { required: true, message: '请输入密码' },
  { pattern: /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/, message: '8~64 个字符，须同时包含字母和数字' },
]
export const USERNAME_RULES = [
  { required: true, message: '请输入用户名' },
  { pattern: /^[A-Za-z0-9_.@-]{3,50}$/, message: '3~50 位字母、数字或 _ . @ -' },
]
export const PHONE_RULES = [{ pattern: /^(\+?[0-9-]{5,20})?$/, message: '手机号格式不正确' }]
