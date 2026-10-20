import { Card } from 'antd'
import { AlarmTable } from '@/features/alarm/AlarmTable'
import { ScopeHeader } from '@/layouts/app/ScopeHeader'
import { useScope } from '@/layouts/app/useScope'

/** 告警 (FRONTEND_DESIGN §5.4)：范围取自设备树，默认只看未处理 */
export default function AlarmsPage() {
  const { siteId, deviceId } = useScope()
  return (
    <>
      <ScopeHeader />
      <Card
        variant="borderless"
        className="layout-fill"
        title="告警"
        extra={<span className="text-fg-tertiary text-xs">告警只保留当月与上月</span>}
      >
        <AlarmTable
          key={`${siteId}:${deviceId}`}
          siteId={siteId ?? undefined}
          deviceId={deviceId ?? undefined}
          defaultProcessed="false"
        />
      </Card>
    </>
  )
}
