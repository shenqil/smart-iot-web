import { type Map as LeafletMap, latLngBounds, type PointExpression } from 'leaflet'
import { type ReactNode, type RefObject, useEffect } from 'react'
import { Popup, useMap } from 'react-leaflet'
import { ClusterLayer } from '@/components/map/ClusterLayer'
import { type DeviceMapPoint, deviceClusterItem } from '@/components/map/DeviceMap'
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

/** 让视野包含全部设备，避开两侧面板与底部卡片；园区没有已定位的设备时以园区坐标为中心 */
export function fitSite(map: LeafletMap, site: SiteView, points: ScreenMapPoint[], padding: FitPadding) {
  if (points.length) {
    map.fitBounds(latLngBounds(points.map((p) => [p.latitude, p.longitude])), { ...padding, maxZoom: 17 })
  } else if (site.latitude != null && site.longitude != null) {
    map.setView([site.latitude, site.longitude], 15)
  }
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
 * 大屏地图：天地图影像 (可切矢量)，铺满视口；只显示设备定位针 (聚合) + 选中设备的实时值气泡，不显示园区标点
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
