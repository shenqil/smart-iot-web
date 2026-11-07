import { useScope } from '@/layouts/app/useScope'
import { CompanyOverview } from './CompanyOverview'
import { DeviceWorkspace } from './device/DeviceWorkspace'
import { SiteOverview } from './SiteOverview'

/** 监测：按设备树选中项显示企业总览 / 园区总览 / 设备工作区 */
export default function MonitorPage() {
  const { siteId, deviceId } = useScope()
  if (siteId && deviceId) return <DeviceWorkspace siteId={siteId} deviceId={deviceId} />
  if (siteId) return <SiteOverview siteId={siteId} />
  return <CompanyOverview />
}
