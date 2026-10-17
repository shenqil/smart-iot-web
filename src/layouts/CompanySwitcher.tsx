import { Avatar, Select } from 'antd'
import { useNavigate } from 'react-router'
import { useCompanyId, useMyCompanies } from '@/hooks/session'
import { companyAllows, companyDenyReason, portalHome } from '@/lib/portal'

/** 企业切换：按端的进入条件置灰并说明原因；切换 = 跳到该企业的端首页 */
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
      onChange={(id) => navigate(portalHome(portal, id))}
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
