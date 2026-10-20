import { ScopeHeader } from '@/layouts/app/ScopeHeader'
import { useScope } from '@/layouts/app/useScope'
import { CompanyOverview } from './CompanyOverview'
import { DeviceWorkspace } from './device/DeviceWorkspace'
import { SiteOverview } from './SiteOverview'

/** 监测：按设备树选中项显示企业总览 / 园区总览 / 设备工作区 */
export default function MonitorPage() {
  const { siteId, deviceId } = useScope()
  return (
    <>
      <ScopeHeader showStatus={!deviceId} />
      {siteId && deviceId ? (
        <DeviceWorkspace siteId={siteId} deviceId={deviceId} />
      ) : siteId ? (
        <SiteOverview siteId={siteId} />
      ) : (
        <CompanyOverview />
      )}
    </>
  )
}
