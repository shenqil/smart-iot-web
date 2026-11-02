import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { byChannel, readSensor } from '@/features/telemetry/lib/realtime'
import { realtimeQuery } from '@/features/telemetry/realtime/api'
import { useCompanyId } from '@/hooks/session'
import { useInView } from '@/hooks/useInView'
import { mobileDeviceQuery } from './api'
import type { DeviceBookmark } from './preferences'
import { Icon, useVisible } from './ui'

export function DeviceBookmarkCard({ bookmark }: { bookmark: DeviceBookmark }) {
  const cid = useCompanyId(),
    visible = useVisible(),
    { ref, inView } = useInView<HTMLDivElement>()
  const device = useQuery({ ...mobileDeviceQuery(cid, bookmark.id), enabled: inView })
  const rt = useQuery({
    ...realtimeQuery(cid, bookmark.id),
    enabled: inView && visible && !!device.data?.sensors.length,
    refetchInterval: 30_000,
  })
  const d = device.data,
    sensor = d ? byChannel(d.sensors)[0] : null,
    reading = sensor ? readSensor(sensor, rt.data?.sensors) : null
  return (
    <div ref={ref}>
      <Link
        className="h5-bookmark"
        to={`/h5/${cid}/devices?deviceId=${bookmark.id}${bookmark.siteId ? `&siteId=${bookmark.siteId}` : ''}`}
      >
        <div className="h5-row">
          <Icon name={d?.sensors.length ? 'sensor' : 'devices'} />
          <span className={d?.online ? 'h5-online' : 'h5-muted'}>
            {d
              ? d.onlineKnown === false
                ? '? 状态未知'
                : d.online
                  ? '● 在线'
                  : '○ 离线'
              : device.isError
                ? '不可访问'
                : '加载中'}
          </span>
        </div>
        <strong>{d?.name ?? bookmark.name}</strong>
        {reading ? (
          <div className="h5-reading">
            {reading.text}
            <small>{sensor?.unit}</small>
          </div>
        ) : (
          <small className="h5-muted">{d?.relays.length ? `${d.relays.length} 路继电器` : '点击查看设备'}</small>
        )}
        {reading && (
          <small>
            {reading.name}
            {!d?.online ? ' · 最后上报值' : ''}
          </small>
        )}
      </Link>
    </div>
  )
}

/** 只为可见设备读取关键值，列表不会同时高频轮询全部设备。 */
export function DeviceReading({ device }: { device: import('@/features/device/api').AppDevice }) {
  const cid = useCompanyId(),
    visible = useVisible(),
    { ref, inView } = useInView<HTMLDivElement>(),
    sensor = byChannel(device.sensors)[0]
  const q = useQuery({
      ...realtimeQuery(cid, device.id),
      enabled: !!sensor && visible && inView,
      refetchInterval: 30_000,
    }),
    reading = sensor ? readSensor(sensor, q.data?.sensors) : null
  return (
    <div ref={ref} className="h5-row-reading">
      {reading
        ? `${sensor?.label || sensor?.standardName || `通道 ${sensor?.channel}`} ${reading.text} ${sensor?.unit ?? ''}${!device.online ? ' · 最后上报' : ''}${q.isError ? ' · 刷新失败' : ''}`
        : device.hasCamera
          ? '视频监控'
          : `${device.relays.length} 路控制`}
    </div>
  )
}
