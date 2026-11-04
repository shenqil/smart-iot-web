import { Segmented } from 'antd'
import { useNavigate } from 'react-router'
import { useCompanyIdOrNull, useMe, useMyCompanies } from '@/hooks/session'
import { availablePortals, PORTAL_LABEL, type Portal, switchPortalPath } from '@/lib/portal'

/** 端切换：只显示有权限的端，只有一个时隐藏 (FRONTEND_DESIGN §1.2) */
export function PortalSwitcher({ current }: { current: Portal }) {
  const me = useMe()
  const companies = useMyCompanies()
  const companyId = useCompanyIdOrNull()
  const navigate = useNavigate()
  const portals = availablePortals(me, companies)
  if (portals.length <= 1) return null
  return (
    <Segmented<Portal>
      value={current}
      options={portals.map((p) => ({ value: p, label: PORTAL_LABEL[p] }))}
      onChange={(p) => navigate(switchPortalPath(p, companies, companyId))}
    />
  )
}
