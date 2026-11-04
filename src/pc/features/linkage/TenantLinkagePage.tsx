import { useMemo } from 'react'
import { tenantDeviceConfigApi } from '@/features/device/config/api'
import { useCompanyId } from '@/hooks/session'
import { LinkageOverview } from './LinkageOverview'

/** 企业 · 联动总览 (只显示两边设备都属于本企业的联动) */
export default function TenantLinkagePage() {
  const cid = useCompanyId()
  const cfg = useMemo(() => tenantDeviceConfigApi(cid), [cid])
  return <LinkageOverview cfg={cfg} />
}
