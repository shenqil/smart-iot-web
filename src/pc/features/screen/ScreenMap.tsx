import { type Map as LeafletMap, latLngBounds, type PointExpression } from 'leaflet'
import { type ReactNode, type RefObject, useEffect } from 'react'
import { Polygon, Popup, Tooltip, useMap } from 'react-leaflet'
import { ClusterLayer } from '@/components/map/ClusterLayer'
import { type DeviceMapPoint, deviceClusterItem } from '@/components/map/DeviceMap'
import { type TdtLayerName, TdtMap } from '@/components/map/TdtMap'
import type { SiteView } from '@/features/site/api'
import { geofenceSignature, parseGeofences } from '@/features/site/tenant/geofence/model'

export interface ScreenMapPoint extends DeviceMapPoint {
  longitude: number
  latitude: number
}

export interface FitPadding {
  paddingTopLeft: PointExpression
  paddingBottomRight: PointExpression
}

/** 设备坐标加上围栏顶点，供视野框选。围栏环是 [经度, 纬度] */
function fitLatLngs(site: SiteView, points: ScreenMapPoint[]): [number, number][] {
  return [
    ...points.map((p) => [p.latitude, p.longitude] as [number, number]),
    ...parseGeofences(site.properties).flatMap((area) => area.ring.map(([lng, lat]) => [lat, lng] as [number, number])),
  ]
}

/** 让视野包含设备和电子围栏，避开两侧面板与底部卡片；都没有时以园区坐标为中心 */
export function fitSite(map: LeafletMap, site: SiteView, points: ScreenMapPoint[], padding: FitPadding) {
  const latlngs = fitLatLngs(site, points)
  if (latlngs.length) {
    map.fitBounds(latLngBounds(latlngs), { ...padding, maxZoom: 17 })
  } else if (site.latitude != null && site.longitude != null) {
    map.setView([site.latitude, site.longitude], 15)
  }
}

function padKey(padding: FitPadding) {
  const part = (p: FitPadding['paddingTopLeft']) => (Array.isArray(p) ? p.join(',') : String(p))
  return `${part(padding.paddingTopLeft)}|${part(padding.paddingBottomRight)}`
}

/** 园区、围栏、标点或面板避让变化时自动适配视野 (之后用户拖动缩放不打扰) */
function AutoFit({ site, points, padding }: { site: SiteView; points: ScreenMapPoint[]; padding: FitPadding }) {
  const map = useMap()
  const sig = `${site.id}|${geofenceSignature(parseGeofences(site.properties))}|${points.map((p) => `${p.id}:${p.longitude},${p.latitude}`).join('|')}|${padKey(padding)}`
  // biome-ignore lint/correctness/useExhaustiveDependencies: 只在签名变化时调整
  useEffect(() => {
    fitSite(map, site, points, padding)
  }, [sig, map])
  return null
}

/** 选中设备在面板后面时平移到可见区域；底部卡片变化时再移一次 */
function KeepVisible({ point, padding }: { point: ScreenMapPoint | undefined; padding: FitPadding }) {
  const map = useMap()
  const sig = `${point?.id ?? ''}|${padKey(padding)}`
  // biome-ignore lint/correctness/useExhaustiveDependencies: 只在选中设备或避让变化时
  useEffect(() => {
    if (point) map.panInside([point.latitude, point.longitude], padding)
  }, [sig, map])
  return null
}

/**
 * 大屏地图：天地图影像 (可切矢量)，铺满视口；显示园区电子围栏和设备定位针 (聚合) + 选中设备的实时值气泡，不显示园区标点
 * 点击设备 → onPick；摄像头 → onPickCamera；点击后在该标点上方显示气泡 (默认不显示，点地图空白处关闭)
 */
export function ScreenMap({
  mapRef,
  layer,
  site,
  points,
  selectedId,
  isCamera,
  onPick,
  onPickCamera,
  padding,
  bubbleId,
  onBubbleClose,
  renderBubble,
}: {
  mapRef: RefObject<LeafletMap | null>
  layer: TdtLayerName
  site: SiteView
  points: ScreenMapPoint[]
  selectedId: number | null
  isCamera: (id: number) => boolean
  onPick: (id: number) => void
  onPickCamera: (id: number) => void
  padding: FitPadding
  /** 显示气泡的标点 (null 不显示) */
  bubbleId: number | null
  onBubbleClose: () => void
  renderBubble: (p: ScreenMapPoint) => ReactNode
}) {
  const items = points.map((p) =>
    deviceClusterItem(p, {
      theme: 'dark',
      selected: p.id === selectedId,
      onClick: () => (isCamera(p.id) ? onPickCamera(p.id) : onPick(p.id)),
    }),
  )
  const selected = points.find((p) => p.id === selectedId)
  const bubbleAt = points.find((p) => p.id === bubbleId)
  const siteLocated = site.latitude != null && site.longitude != null
  return (
    <TdtMap
      mapRef={mapRef}
      variant="screen"
      height="100%"
      layer={layer}
      zoomControl={false}
      center={siteLocated ? [site.latitude as number, site.longitude as number] : undefined}
      zoom={siteLocated ? 15 : 5}
    >
      <SiteFences properties={site.properties} />
      <ClusterLayer items={items} maxClusterRadius={40} />
      <AutoFit site={site} points={points} padding={padding} />
      <KeepVisible point={selected} padding={padding} />
      {bubbleAt && (
        <Popup
          key={bubbleAt.id}
          position={[bubbleAt.latitude, bubbleAt.longitude]}
          offset={[0, bubbleAt.id === selectedId ? -76 : -64]}
          closeButton={false}
          closeOnClick
          autoPan={false}
          className="screen-bubble"
          eventHandlers={{ remove: onBubbleClose }}
        >
          {renderBubble(bubbleAt)}
        </Popup>
      )}
    </TdtMap>
  )
}

/** 名称画在围栏之上、设备标点之下，避免挡住定位针 */
const FENCE_LABEL_PANE = 'screen-fence-label'

function ensureFenceLabelPane(map: LeafletMap) {
  const pane = map.getPane(FENCE_LABEL_PANE) ?? map.createPane(FENCE_LABEL_PANE)
  pane.style.zIndex = '450'
  pane.style.pointerEvents = 'none'
}

/** 已保存的围栏。不接收点击，避免挡住设备标点和地图空白处关气泡 */
function SiteFences({ properties }: { properties: SiteView['properties'] }) {
  const map = useMap()
  const areas = parseGeofences(properties)
  if (!areas.length) return null
  ensureFenceLabelPane(map)
  return (
    <>
      {areas.map((area) => (
        <Polygon
          key={area.id}
          interactive={false}
          positions={area.ring.map(([lng, lat]) => [lat, lng])}
          pathOptions={{ color: '#22d3ee', weight: 2, fillColor: '#22d3ee', fillOpacity: 0.14 }}
        >
          <Tooltip permanent direction="center" pane={FENCE_LABEL_PANE} className="screen-fence-label" opacity={1}>
            <span title={area.name}>{area.name}</span>
          </Tooltip>
        </Polygon>
      ))}
    </>
  )
}
