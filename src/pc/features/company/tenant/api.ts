import { queryOptions } from '@tanstack/react-query'
import { api, companyHeader, type Schemas, unwrap } from '@/api/client'

export type TenantCompany = Schemas['CompanyDetailView']
/** 企业端可修改的资料 (部分更新)；名称、状态、过期时间只能由平台修改 */
export type CompanyTenantBody = Schemas['CompanyTenantBody']

export const tenantCompanyKey = (cid: number) => ['tenant', cid, 'company'] as const

/** 本企业详情 (含成员 / 设备 / 园区数) */
export const tenantCompanyQuery = (cid: number) =>
  queryOptions({
    queryKey: tenantCompanyKey(cid),
    queryFn: () => unwrap(api.GET('/api/v1/tenant/company', { params: { header: companyHeader(cid) } })),
  })

export const updateTenantCompany = (cid: number, body: CompanyTenantBody) =>
  unwrap(api.PUT('/api/v1/tenant/company', { params: { header: companyHeader(cid) }, body }))
