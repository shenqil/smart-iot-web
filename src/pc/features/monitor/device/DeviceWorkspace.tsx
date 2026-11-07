import { DisconnectOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Card, Empty, Result, Skeleton } from 'antd'
import { type AppDevice, appSiteDevicesQuery } from '@/features/device/api'
import { type DeviceType, useDeviceTypes } from '@/features/dict/api'
import { RelayPanel } from '@/features/relay/RelayPanel'
import { agoText, byChannel, isVideoDeviceType, readSensor } from '@/features/telemetry/lib/realtime'
import { realtimeQuery } from '@/features/telemetry/realtime/api'
import { SensorCard } from '@/features/telemetry/realtime/SensorCard'
import { useReadingTrail } from '@/features/telemetry/realtime/useReadingTrail'
import { useCompanyId } from '@/hooks/session'
import { useNow } from '@/hooks/useNow'
import { fmtDateTime } from '@/lib/time'
import { DeviceHero } from './DeviceHero'
import { VideoPanel } from './VideoPanel'

/**
 * 设备工作区 (FRONTEND_DESIGN §5.3)
 * - 视频监控类型：只展示视频
 * - 有传感器通道 → 实时数据；有继电器通道 → 继电器控制
 */
export function DeviceWorkspace({ siteId, deviceId }: { siteId: number; deviceId: number }) {
  const companyId = useCompanyId()
  const devices = useQuery(appSiteDevicesQuery(companyId, siteId))
  const types = useDeviceTypes()
  const device = devices.data?.find((d) => d.id === deviceId)

  if (devices.isPending) return <Skeleton active className="rounded-lg bg-container p-5" />
  if (!device)
    return (
      <Result
        status="404"
        title="设备不存在或已移出该园区"
        subTitle="请在左侧园区设备树中重新选择设备"
        className="rounded-lg bg-container"
      />
    )

  const type = device.deviceTypeId != null ? types.byId.get(device.deviceTypeId) : undefined
  if (isVideoDeviceType(type?.name))
    return (
      <div className="flex flex-col gap-4">
        <DeviceHero device={device} type={type} online={device.online} hideInterval />
        <VideoPanel device={device} />
      </div>
    )
  return <TelemetryWorkspace key={device.id} device={device} type={type} />
}

function TelemetryWorkspace({ device, type }: { device: AppDevice; type: DeviceType | undefined }) {
  const companyId = useCompanyId()
  const now = useNow()
  const rt = useQuery(realtimeQuery(companyId, device.id))
  const realtime = rt.data
  const online = realtime?.online ?? device.online
  const sensors = byChannel(device.sensors)
  const relays = byChannel(device.relays)
  const trail = useReadingTrail(realtime?.sensors, realtime?.sensorsAt)
  const readings = sensors.map((c) => readSensor(c, realtime?.sensors))
  const outOfRange = readings.filter((r) => r.state === 'over' || r.state === 'under').length

  // 超过 3 个采集周期 (至少 1 分钟) 没有新数据视为过期
  const staleMs = Math.max(60, device.readInterval * 3) * 1000
  const sensorsAt = realtime?.sensorsAt
  const stale = Boolean(online && sensorsAt && now - Date.parse(sensorsAt) > staleMs)

  const updated = sensorsAt ?? realtime?.relaysAt
  const meta = updated && (
    <span title={fmtDateTime(updated)} className={stale ? 'text-warning' : undefined}>
      {stale ? '数据已 ' : '更新于 '}
      {agoText(updated, now)}
      {stale ? '未更新' : ''}
    </span>
  )

  const sensorSection = sensors.length > 0 && (
    <Card
      variant="borderless"
      title={
        <span className="flex items-center gap-2">
          实时数据
          <span className="font-normal text-fg-tertiary text-sm">{sensors.length} 个通道</span>
        </span>
      }
      extra={outOfRange > 0 && <span className="text-sm text-warning">⚠ {outOfRange} 个通道超出量程</span>}
    >
      {rt.isError && !realtime ? (
        <Alert type="error" showIcon title="实时数据获取失败，正在重试" />
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
          {readings.map((r) => (
            <SensorCard key={r.config.channel} reading={r} trail={trail[r.config.channel] ?? []} offline={!online} />
          ))}
        </div>
      )}
    </Card>
  )

  const relaySection = relays.length > 0 && (
    <Card
      variant="borderless"
      title={
        <span className="flex items-center gap-2">
          继电器控制
          <span className="font-normal text-fg-tertiary text-sm">{relays.length} 路</span>
        </span>
      }
      extra={
        realtime?.relaysAt && (
          <span className="text-fg-tertiary text-xs" title={fmtDateTime(realtime.relaysAt)}>
            状态更新于 {agoText(realtime.relaysAt, now)}
          </span>
        )
      }
    >
      <RelayPanel device={device} realtime={realtime} layout="grid" />
    </Card>
  )

  const realtimeContent = (
    <>
      {!online && (
        <Alert
          type="warning"
          showIcon
          icon={<DisconnectOutlined />}
          title={`设备离线，以下为最后一次上报的数据${updated ? ` (${fmtDateTime(updated)})` : ''}${relays.length ? '；离线期间无法控制继电器' : ''}`}
        />
      )}

      {sensorSection}
      {relaySection}

      {!sensors.length && !relays.length && (
        <Card variant="borderless">
          <Empty description="该设备还没有配置传感器或继电器通道，请联系企业管理员在设备配置中添加" />
        </Card>
      )}
    </>
  )

  return (
    <div className="flex flex-col gap-4">
      <DeviceHero device={device} type={type} online={online} meta={meta} />
      {realtimeContent}
    </div>
  )
}
