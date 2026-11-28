import { unprocessedAlarmCountsQuery } from '@shared/api/alarm'
import type { AppDevice } from '@shared/api/device'
import { appSiteDevicesQuery } from '@shared/api/device'
import { useDeviceTypes } from '@shared/api/dict'
import { appSitesQuery } from '@shared/api/site'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'antd-mobile'
import { latLngBounds } from 'leaflet'
import { useEffect, useState } from 'react'
import { Marker, Polygon, Tooltip, useMap } from 'react-leaflet'
import { Link, useSearchParams } from 'react-router'
import { deviceGlyphKind, deviceMarkerIcon, deviceMarkerTitle } from '@/components/map/markers'
import { TdtMap } from '@/components/map/TdtMap'
import { type GeofenceArea, parseGeofences } from '@/features/site/tenant/geofence/model'
import { useCompanyId } from '@/hooks/session'
import { isValidLngLat } from '@/lib/tianditu'
import { positiveId } from '../filters'
import { Card, Choice, Empty, Failure, Loading, Page } from '../ui'

/** 每页 200 台，100 页即 2 万台。超过后整页失败，避免把截断列表当成这个园区的全部设备。 */
const MAP_DEVICE_PAGES = 100

/** 园区设备地图：电子围栏和设备标点，可切换园区。围栏样式与企业管理端围栏页一致。 */
export default function MapPage() {
  const cid = useCompanyId()
  const [params, setParams] = useSearchParams()
  const sites = useQuery(appSitesQuery(cid))
  const requested = positiveId(params.get('siteId'))
  const known = sites.data?.find((item) => item.id === requested)
  const site = requested == null ? sites.data?.[0] : known
  const siteMissing = requested != null && sites.isSuccess && known == null
  const devices = useQuery({ ...appSiteDevicesQuery(cid, site?.id ?? 0, MAP_DEVICE_PAGES), enabled: site != null })
  const census = useQuery({
    ...unprocessedAlarmCountsQuery(cid, { siteId: site?.id }),
    enabled: site != null,
  })
  const types = useDeviceTypes()
  const areas = site ? parseGeofences(site.properties) : []
  const center =
    site && isValidLngLat(site.longitude, site.latitude)
      ? ([site.latitude ?? 0, site.longitude ?? 0] as [number, number])
      : undefined
  const rows = devices.data ?? []
  const alarmsOf = alarmCounts(census.data?.sites, site?.id)
  const located = rows.filter((device) => isValidLngLat(device.longitude, device.latitude))
  const unlocated = rows.filter((device) => !isValidLngLat(device.longitude, device.latitude))
  const points = [
    ...areas.flatMap((area) => area.ring.map(([lng, lat]) => [lat, lng] as [number, number])),
    ...located.map((device) => [device.latitude ?? 0, device.longitude ?? 0] as [number, number]),
  ]
  const [selection, setSelection] = useState<{ siteId: number; deviceId: number } | null>(null)
  const selected = selection?.siteId === site?.id ? rows.find((device) => device.id === selection.deviceId) : undefined

  useEffect(() => {
    if (requested != null || !sites.data?.length) return
    setParams({ siteId: String(sites.data[0].id) }, { replace: true })
  }, [requested, sites.data, setParams])

  return (
    <Page title="设备分布">
      {sites.isPending ? (
        <Loading />
      ) : sites.isError ? (
        <Failure error={sites.error} retry={() => void sites.refetch()} />
      ) : !sites.data?.length ? (
        <Empty title="暂无园区" />
      ) : (
        <>
          <Choice
            label="园区"
            value={site ? String(site.id) : ''}
            options={sites.data.map((item) => ({ label: item.name, value: String(item.id) }))}
            onChange={(value) => setParams({ siteId: value }, { replace: true })}
          />
          {siteMissing ? (
            <Empty title="没有这个园区" />
          ) : devices.isPending ? (
            <Loading />
          ) : devices.isError ? (
            <Failure error={devices.error} retry={() => void devices.refetch()} />
          ) : (
            <>
              <p className="h5-muted">
                {rows.length} 台设备 · 可定位 {located.length} 台 · 无坐标 {unlocated.length} 台
              </p>
              {!points.length && !center ? (
                <Empty title={rows.length ? '这些设备还没有坐标' : '这个园区还没有可显示的位置'} />
              ) : (
                <div className="h5-map" key={site?.id}>
                  <TdtMap height="100%" center={center} zoom={center ? 16 : 4}>
                    <Fences areas={areas} />
                    {located.map((device) => {
                      const type = device.deviceTypeId == null ? undefined : types.byId.get(device.deviceTypeId)
                      const kind = deviceGlyphKind(type?.name)
                      const alarms = alarmsOf.get(device.id) ?? 0
                      return (
                        <Marker
                          key={device.id}
                          position={[device.latitude ?? 0, device.longitude ?? 0]}
                          icon={deviceMarkerIcon({
                            name: device.name,
                            online: device.online,
                            alarms,
                            kind,
                            iconUrl: type?.iconUrl || undefined,
                            theme: 'light',
                          })}
                          title={deviceMarkerTitle({ name: device.name, online: device.online, alarms, kind })}
                          eventHandlers={{
                            click: () => site && setSelection({ siteId: site.id, deviceId: device.id }),
                          }}
                        />
                      )
                    })}
                    <Frame points={points} center={center} />
                  </TdtMap>
                </div>
              )}
              {selected && site && (
                <Card
                  title={selected.name}
                  extra={
                    <Button size="mini" fill="none" onClick={() => setSelection(null)}>
                      关闭
                    </Button>
                  }
                >
                  <p>
                    {types.nameOf(selected.deviceTypeId)} · {selected.deviceSn} · {selected.online ? '在线' : '离线'}
                    {(alarmsOf.get(selected.id) ?? 0) > 0 ? ` · ${alarmsOf.get(selected.id)} 条未处理告警` : ''}
                  </p>
                  <DeviceLinks cid={cid} siteId={site.id} device={selected} />
                </Card>
              )}
              {unlocated.length > 0 && site && (
                <Card title="未设置坐标">
                  {unlocated.map((device) => (
                    <div className="h5-list-link" key={device.id}>
                      <div>
                        {device.name}
                        <small className="h5-muted">
                          {' '}
                          {types.nameOf(device.deviceTypeId)} · {device.deviceSn}
                          {(alarmsOf.get(device.id) ?? 0) > 0 ? ` · ${alarmsOf.get(device.id)} 条未处理告警` : ''}
                        </small>
                      </div>
                      <DeviceLinks cid={cid} siteId={site.id} device={device} />
                    </div>
                  ))}
                </Card>
              )}
            </>
          )}
        </>
      )}
    </Page>
  )
}

function DeviceLinks({ cid, siteId, device }: { cid: number; siteId: number; device: AppDevice }) {
  return (
    <>
      <Link
        className="h5-navigation-card"
        to={`/h5/${cid}/alarms?deviceId=${device.id}&processed=false&siteId=${siteId}`}
      >
        查看设备告警 ›
      </Link>
      <Link className="h5-navigation-card" to={`/h5/${cid}/devices?siteId=${siteId}&deviceId=${device.id}`}>
        查看设备详情 ›
      </Link>
    </>
  )
}

function alarmCounts(
  sites: { siteId: number; devices: { deviceId: number; count: number }[] }[] | undefined,
  siteId: number | undefined,
) {
  const counts = new Map<number, number>()
  const site = sites?.find((item) => item.siteId === siteId)
  for (const device of site?.devices ?? []) counts.set(device.deviceId, device.count)
  return counts
}

const FENCE_LABEL_PANE = 'siot-fence-label'

function Fences({ areas }: { areas: GeofenceArea[] }) {
  const map = useMap()
  if (!areas.length) return null
  const pane = map.getPane(FENCE_LABEL_PANE) ?? map.createPane(FENCE_LABEL_PANE)
  pane.style.zIndex = '450'
  pane.style.pointerEvents = 'none'
  return (
    <>
      {areas.map((area) => (
        <Polygon
          key={area.id}
          interactive={false}
          positions={area.ring.map(([lng, lat]) => [lat, lng])}
          pathOptions={{ color: '#0891b2', weight: 2, fillColor: '#06b6d4', fillOpacity: 0.16 }}
        >
          <Tooltip permanent direction="center" pane={FENCE_LABEL_PANE} className="siot-fence-label" opacity={1}>
            <span title={area.name}>{area.name}</span>
          </Tooltip>
        </Polygon>
      ))}
    </>
  )
}

function Frame({ points, center }: { points: [number, number][]; center?: [number, number] }) {
  const map = useMap()
  const sig = `${center?.join(',') ?? ''}|${points.map((point) => point.join(',')).join(';')}`
  // biome-ignore lint/correctness/useExhaustiveDependencies: 只在园区内容变化时适配视野
  useEffect(() => {
    if (points.length) {
      map.fitBounds(latLngBounds(points), { padding: [28, 28], maxZoom: 17 })
      return
    }
    if (center) map.setView(center, 16)
  }, [map, sig])
  return null
}
