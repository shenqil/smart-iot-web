import { useCompanyId } from '@/hooks/session'
import { AdminLayout } from '@/layouts/AdminLayout'
import { tenantMenu } from './menu'

export default function TenantPortalLayout() {
  const companyId = useCompanyId()
  return <AdminLayout portal="tenant" basePath={`/tenant/${companyId}`} menu={tenantMenu} />
}
