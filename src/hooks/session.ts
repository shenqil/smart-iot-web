import { useSuspenseQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { meQuery, myCompaniesQuery } from '@/features/auth/api'

/** 当前用户 (路由 loader 已预取，组件内可直接使用) */
export const useMe = () => useSuspenseQuery(meQuery).data

/** 我的企业 */
export const useMyCompanies = () => useSuspenseQuery(myCompaniesQuery).data

/** 当前路由中的企业 ID (企业端 / 数据端 / 大屏)，不在企业路由下时为 null */
export function useCompanyIdOrNull(): number | null {
  const { companyId } = useParams()
  return companyId ? Number(companyId) : null
}

export function useCompanyId(): number {
  const id = useCompanyIdOrNull()
  if (id == null) throw new Error('useCompanyId 只能在企业路由下使用')
  return id
}

export function useCurrentCompany() {
  const id = useCompanyIdOrNull()
  return useMyCompanies().find((c) => c.companyId === id) ?? null
}
