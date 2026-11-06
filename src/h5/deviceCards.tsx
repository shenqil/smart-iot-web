import type { AppDevice } from '@shared/api/device'
import { useDeviceTypes } from '@shared/api/dict'
import { byChannel, isVideoDeviceType, readSensor } from '@shared/telemetry/lib/realtime'
import { realtimeQuery } from '@shared/telemetry/realtime/api'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'antd-mobile'
import { memo } from 'react'
import { Link } from 'react-router'
import { useCompanyId } from '@/hooks/session'
import { useInView } from '@/hooks/useInView'
import { mobileDeviceQuery } from './api'
import { DeviceStatus, deviceOnline } from './components/DeviceStatus'
import type { DeviceBookmark } from './preferences'
import { Icon, StatusTag, useVisible } from './ui'

export function DeviceBookmarkCard({ bookmark }: { bookmark: DeviceBookmark }) {
  const cid = useCompanyId(),
    visible = useVisible(),
    types = useDeviceTypes(),
    { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '120px', triggerOnce: true })
  const device = useQuery({
    ...mobileDeviceQuery(cid, bookmark.id, bookmark.siteId),
    enabled: inView && visible,
    refetchInterval: 30_000,
  })
  const d = device.isError ? undefined : device.data
  const isVideo = isVideoDeviceType(types.nameOf(d?.deviceTypeId))
  const rt = useQuery({
    ...realtimeQuery(cid, bookmark.id),
    enabled: inView && visible && !isVideo && !!d?.sensors.length,
    refetchInterval: 30_000,
  })
  const sensor = d ? byChannel(d.sensors)[0] : undefined,
    reading = !isVideo && sensor ? readSensor(sensor, rt.data?.sensors) : null,
    online = isVideo ? true : deviceOnline(d, rt.data)
  return (
    <div ref={ref}>
      <Link
        className="h5-bookmark"
        to={`/h5/${cid}/devices?deviceId=${bookmark.id}${bookmark.siteId ? `&siteId=${bookmark.siteId}` : ''}`}
      >
        <div className="h5-row">
          <span className="h5-bookmark-icon">
            <Icon name={isVideo || d?.hasCamera ? 'camera' : d?.sensors.length ? 'sensor' : 'devices'} size={18} />
          </span>
          {device.isError ? (
            <StatusTag tone="warning">暂不可用</StatusTag>
          ) : device.isPending ? (
            <StatusTag>加载中</StatusTag>
          ) : (
            <DeviceStatus online={online} />
          )}
        </div>
        <strong>{d?.name ?? bookmark.name}</strong>
        {reading ? (
          <>
            <div className="h5-reading">
              {reading.text}
              <small>{sensor?.unit}</small>
            </div>
            <small className="h5-muted">
              {reading.name}
              {online !== true ? ' · 上次上报' : ''}
              {rt.isError ? ' · 刷新失败' : ''}
            </small>
          </>
        ) : (
          <small className="h5-muted">
            {device.isError
              ? '请重试详情；失效设备可移除'
              : isVideo
                ? '视频监控'
                : d?.relays.length
                  ? `${d.relays.length} 路继电器`
                  : '查看设备详情'}
          </small>
        )}
      </Link>
    </div>
  )
}
export function DeviceReading({ device, typeName }: { device: AppDevice; typeName?: string }) {
  const cid = useCompanyId(),
    visible = useVisible(),
    { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '120px', triggerOnce: true }),
    sensor = byChannel(device.sensors)[0]
  const isVideo = isVideoDeviceType(typeName)
  const q = useQuery({
      ...realtimeQuery(cid, device.id),
      enabled: !isVideo && !!sensor && visible && inView,
      refetchInterval: 30_000,
    }),
    reading = !isVideo && sensor ? readSensor(sensor, q.data?.sensors) : null,
    online = deviceOnline(device, q.data)
  return (
    <div ref={ref} className="h5-row-reading">
      {reading ? (
        <>
          <span>{reading.name}</span>
          <b>
            {reading.text}
            <small>{sensor?.unit}</small>
          </b>
          <small>
            {q.isError
              ? '刷新失败，保留上次读数'
              : online === undefined
                ? '在线状态未知'
                : !online
                  ? '最后上报值'
                  : reading.state === 'empty'
                    ? '等待设备上报'
                    : '最近读数'}
          </small>
        </>
      ) : isVideo || device.hasCamera ? (
        '视频监控'
      ) : (
        `${device.relays.length} 路控制`
      )}
    </div>
  )
}
export const DeviceListItem = memo(function DeviceListItem({
  device,
  typeName,
  to,
  favorite,
  onFavorite,
}: {
  device: AppDevice
  typeName: string
  to: string
  favorite: boolean
  onFavorite: () => void
}) {
  const cid = useCompanyId(),
    rt = useQuery({ ...realtimeQuery(cid, device.id), enabled: false })
  const isVideo = isVideoDeviceType(typeName)
  return (
    <article className="h5-device-item">
      <div className="h5-device-item-head">
        <Link to={to} className="h5-device-identity">
          <span className="h5-device-glyph">
            <Icon name={isVideo || device.hasCamera ? 'camera' : device.sensors.length ? 'sensor' : 'relay'} />
          </span>
          <div>
            <strong>{device.name}</strong>
            <small>
              {typeName} · SN {device.deviceSn}
            </small>
          </div>
        </Link>
        <Button
          fill="none"
          className="h5-favorite-button"
          aria-pressed={favorite}
          aria-label={`${favorite ? '取消关注' : '关注'}${device.name}`}
          onClick={onFavorite}
        >
          {favorite ? '★' : '☆'}
        </Button>
      </div>
      <Link to={to} className="h5-device-item-body">
        <div className="h5-tags">
          <DeviceStatus online={isVideo ? true : deviceOnline(device, rt.data)} />
          {device.status !== 'active' && (
            <StatusTag tone="warning">{device.status === 'fault' ? '故障' : '停用'}</StatusTag>
          )}
          {!isVideo && device.hasAlarm && <StatusTag tone="danger">待处理告警</StatusTag>}
          {!isVideo && (
            <span className="h5-muted">
              {device.sensors.length} 路采集 · {device.relays.length} 路控制
            </span>
          )}
        </div>
        <DeviceReading device={device} typeName={typeName} />
      </Link>
    </article>
  )
})
