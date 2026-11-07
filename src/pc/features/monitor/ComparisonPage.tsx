import { useQuery } from '@tanstack/react-query'
import { Card, Empty, Skeleton } from 'antd'
import { useState } from 'react'
import { type AppDevice, appSiteDevicesQuery } from '@/features/device/api'
import { ComparisonPanel } from '@/features/telemetry/comparison/ComparisonPanel'
import { byChannel } from '@/features/telemetry/lib/realtime'
import { useCompanyId } from '@/hooks/session'
import { useScope } from '@/layouts/app/useScope'

function ComparisonContent({ device }: { device: AppDevice }) {
  const sensors = byChannel(device.sensors)
  const [channels, setChannels] = useState(() => sensors.slice(0, 2).map((s) => s.channel))
  return <ComparisonPanel device={device} channels={channels} onChannelsChange={setChannels} />
}

/** 日 / 月环比 (FRONTEND_DESIGN §5.3)：针对普通设备的传感器通道日/月环比趋势分析 */
export default function ComparisonPage() {
  const { siteId, deviceId } = useScope()
  const companyId = useCompanyId()
  const devices = useQuery({
    ...appSiteDevicesQuery(companyId, siteId ?? 0),
    enabled: Boolean(siteId && deviceId),
  })
  const device = devices.data?.find((d) => d.id === deviceId)
  const sensors = byChannel(device?.sensors)

  if (!siteId || !deviceId) {
    return (
      <Card variant="borderless" className="layout-fill">
        <Empty description="请在左侧选择具体设备查看环比数据" />
      </Card>
    )
  }

  if (devices.isPending) {
    return <Skeleton active className="rounded-lg bg-container p-5" />
  }

  if (!device) {
    return (
      <Card variant="borderless" className="layout-fill">
        <Empty description="设备不存在或已移出该园区" />
      </Card>
    )
  }

  if (sensors.length === 0) {
    return (
      <Card variant="borderless" className="layout-fill">
        <Empty description="该设备未配置传感器通道，无法查看环比数据" />
      </Card>
    )
  }

  return <ComparisonContent key={device.id} device={device} />
}
