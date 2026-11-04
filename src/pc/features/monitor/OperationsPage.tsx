import { useQueries, useQuery } from '@tanstack/react-query'
import { Card } from 'antd'
import { type AppDevice, appSiteDevicesQuery } from '@/features/device/api'
import { OperationTable } from '@/features/relay/OperationTable'
import { appSitesQuery } from '@/features/site/api'
import { useCompanyId } from '@/hooks/session'
import { ScopeHeader } from '@/layouts/app/ScopeHeader'
import { useScope } from '@/layouts/app/useScope'

/** 加载设备列表 (与设备树共用缓存) 的园区数上限，超出的园区设备只显示 SN 与通道号 */
const MAX_SITES = 20

/** 继电器操作记录 (FRONTEND_DESIGN §5.5)：用园区设备列表把设备 ID、通道号转成名称 */
export default function OperationsPage() {
  const { siteId, deviceId } = useScope()
  const companyId = useCompanyId()
  const sites = useQuery(appSitesQuery(companyId))
  const siteIds = siteId ? [siteId] : (sites.data ?? []).slice(0, MAX_SITES).map((s) => s.id)
  const lists = useQueries({ queries: siteIds.map((id) => appSiteDevicesQuery(companyId, id)) })
  const devices = new Map<number, AppDevice>()
  for (const q of lists) for (const d of q.data ?? []) devices.set(d.id, d)

  return (
    <>
      <ScopeHeader />
      <Card
        variant="borderless"
        className="layout-fill"
        title="继电器操作记录"
        extra={<span className="text-fg-tertiary text-xs">包含其他企业成员对同一设备的操作；只保留当月与上月</span>}
      >
        <OperationTable
          key={`${siteId}:${deviceId}`}
          siteId={siteId ?? undefined}
          deviceId={deviceId ?? undefined}
          deviceOf={(id) => devices.get(id)}
        />
      </Card>
    </>
  )
}
