import type { QueryClient } from '@tanstack/react-query'

/** 企业端资源 (Query Key 第三段) */
export type TenantResource = 'company' | 'sites' | 'devices' | 'users'

/**
 * 企业端变更后刷新相关缓存：['tenant', companyId, resource]
 * 挂载关系同时影响园区 / 设备两侧以及企业概览的计数，调用方按影响范围传入
 */
export function invalidateTenant(qc: QueryClient, companyId: number, ...resources: TenantResource[]) {
  for (const r of resources) qc.invalidateQueries({ queryKey: ['tenant', companyId, r] })
}
