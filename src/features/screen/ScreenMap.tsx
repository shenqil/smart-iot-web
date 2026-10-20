import { type Map as LeafletMap, latLngBounds, type PointExpression } from 'leaflet'
import { type ReactNode, type RefObject, useEffect } from 'react'
import { Marker, Popup, useMap } from 'react-leaflet'
import { ClusterLayer } from '@/components/map/ClusterLayer'
import { type DeviceMapPoint, deviceClusterItem } from '@/components/map/DeviceMap'
import { siteMarkerIcon, siteMarkerTitle } from '@/components/map/markers'
import { type TdtLayerName, TdtMap } from '@/components/map/TdtMap'
import type { SiteView } from '@/features/site/api'

export interface ScreenMapPoint extends DeviceMapPoint {
  longitude: number
  latitude: number
}

export interface FitPadding {
  paddingTopLeft: PointExpression
  paddingBottomRight: PointExpression
}

/** 让视野包含园区与全部设备，避开两侧面板与底部卡片 */
export function fitSite(map: LeafletMap, site: SiteView, points: ScreenMapPoint[], padding: FitPadding) {
  const coords: [number, number][] = points.map((p) => [p.latitude, p.longitude])
  if (site.latitude != null && site.longitude != null) coords.push([site.latitude, site.longitude])
  if (!coords.length) return
  map.fitBounds(latLngBounds(coords), { ...padding, maxZoom: 17 })
}

/** 园区或设备集合变化时自动适配视野 (之后用户拖动缩放不打扰) */
function AutoFit({ site, points, padding }: { site: SiteView; points: ScreenMapPoint[]; padding: FitPadding }) {
  const map = useMap()
  const sig = `${site.id}|${points.map((p) => `${p.id}:${p.longitude},${p.latitude}`).join('|')}`
  // biome-ignore lint/correctness/useExhaustiveDependencies: 只在园区 / 标点集合变化时调整
  useEffect(() => {
    fitSite(map, site, points, padding)
  }, [sig, map])
  return null
}

/** 选中设备在面板后面时平移到可见区域 */
function KeepVisible({ point, padding }: { point: ScreenMapPoint | undefined; padding: FitPadding }) {
  const map = useMap()
  // biome-ignore lint/correctness/useExhaustiveDependencies: 只在选中设备变化时
  useEffect(() => {
    if (point) map.panInside([point.latitude, point.longitude], padding)
  }, [point?.id, map])
  return null
}

/**
 * 大屏地图：天地图影像 (可切矢量)，铺满视口；园区方牌 + 设备定位针 (聚合) + 选中设备的实时值气泡
 * 点击设备 → onPick；摄像头 → onPickCamera
 */
export function ScreenMap({
  mapRef,
  layer,
  site,
  points,
  total,
  online,
  alarms,
  selectedId,
  isCamera,
  onPick,
  onPickCamera,
  padding,
  bubble,
}: {
  mapRef: RefObject<LeafletMap | null>
  layer: TdtLayerName
  site: SiteView
  points: ScreenMapPoint[]
  /** 园区设备数 / 在线数 / 未处理告警数 (园区方牌显示) */
  total: number
  online: number
  alarms: number
  selectedId: number | null
  isCamera: (id: number) => boolean
  onPick: (id: number) => void
  onPickCamera: (id: number) => void
  padding: FitPadding
  bubble: ReactNode
}) {
  const items = points.map((p) =>
    deviceClusterItem(p, {
      theme: 'dark',
      selected: p.id === selectedId,
      onClick: () => (isCamera(p.id) ? onPickCamera(p.id) : onPick(p.id)),
    }),
  )
  const selected = points.find((p) => p.id === selectedId)
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
      {siteLocated && (
        <Marker
          position={[site.latitude as number, site.longitude as number]}
          icon={siteMarkerIcon({ name: site.name, status: site.status, online, total, alarms, theme: 'dark' })}
          title={siteMarkerTitle(site)}
          alt={siteMarkerTitle(site)}
          zIndexOffset={-500}
          keyboard={false}
        />
      )}
      <ClusterLayer items={items} maxClusterRadius={40} />
      <AutoFit site={site} points={points} padding={padding} />
      <KeepVisible point={selected} padding={padding} />
      {selected && bubble && (
        <Popup
          key={selected.id}
          position={[selected.latitude, selected.longitude]}
          offset={[0, -62]}
          closeButton={false}
          autoClose={false}
          closeOnClick={false}
          autoPan={false}
          className="screen-bubble"
        >
          {bubble}
        </Popup>
      )}
    </TdtMap>
  )
}
