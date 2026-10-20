import { Avatar, Select } from 'antd'
import { useNavigate } from 'react-router'
import { resetCompanyCache } from '@/app/queryClient'
import { useCompanyId, useMyCompanies } from '@/hooks/session'
import { companyAllows, companyDenyReason, portalHome } from '@/lib/portal'

/**
 * 企业切换：按端的进入条件置灰并说明原因
 * 切换 = 跳到该企业的端首页 (数据端为监测首页，不带园区 / 设备范围)，跳转完成后清理其他企业的缓存数据；
 * 页面内的组件状态 (设备树展开项、搜索、筛选、迷你图等) 由外壳按企业 ID 重新挂载清空
 */
export function CompanySwitcher({
  portal,
  variant = 'outlined',
}: {
  portal: 'tenant' | 'app'
  variant?: 'outlined' | 'borderless'
}) {
  const companies = useMyCompanies()
  const companyId = useCompanyId()
  const navigate = useNavigate()
  return (
    <Select
      value={companyId}
      variant={variant}
      popupMatchSelectWidth={false}
      className="min-w-44 max-w-64"
      onChange={async (id) => {
        if (id === companyId) return
        // 先跳转 (旧页面卸载，停止旧企业的轮询)，再清理，避免旧组件在清理后重新请求
        await navigate(portalHome(portal, id))
        resetCompanyCache(portal, id)
      }}
      options={companies.map((c) => {
        const reason = companyAllows(portal, c) ? null : companyDenyReason(portal, c)
        return {
          value: c.companyId,
          disabled: Boolean(reason),
          label: (
            <span className="flex items-center gap-2">
              <Avatar size={20} shape="square" src={c.logo || undefined} className="shrink-0 bg-primary! text-xs">
                {c.name.slice(0, 1)}
              </Avatar>
              <span className="truncate">{c.name}</span>
              {reason && <span className="text-fg-tertiary text-xs">({reason})</span>}
            </span>
          ),
        }
      })}
    />
  )
}
