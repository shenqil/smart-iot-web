import type { Map as LeafletMap } from 'leaflet'
import { Polygon, Tooltip, useMap } from 'react-leaflet'
import { type ClusterItem, ClusterLayer } from './ClusterLayer'
import { MapLegend } from './MapLegend'
import { type DeviceGlyphKind, deviceGlyphKind, deviceMarkerIcon, deviceMarkerTitle } from './markers'
import { FitBounds } from './SiteMap'
import { TdtMap } from './TdtMap'

export interface DeviceMapPoint {
  id: number
  name: string
  online: boolean
  /** 未处理告警数 */
  alarms: number
  longitude: number | null
  latitude: number | null
  /** 设备类型名称 (选内置图标) 与字典图标 */
  typeName?: string
  iconUrl?: string
}

/** 电子围栏。ring 为 WGS84 [经度, 纬度] */
export interface MapGeofence {
  id: string
  name: string
  ring: [number, number][]
}

type Located = DeviceMapPoint & { longitude: number; latitude: number }
const isLocated = (d: DeviceMapPoint): d is Located => d.longitude != null && d.latitude != null

/** 名称画在围栏之上、设备标点之下，避免挡住定位针 */
const FENCE_LABEL_PANE = 'siot-fence-label'

function ensureFenceLabelPane(map: LeafletMap) {
  const pane = map.getPane(FENCE_LABEL_PANE) ?? map.createPane(FENCE_LABEL_PANE)
  pane.style.zIndex = '450'
  pane.style.pointerEvents = 'none'
}

/** 已保存的围栏。不接收点击，避免挡住设备标点 */
function GeofenceLayer({ areas }: { areas: MapGeofence[] }) {
  const map = useMap()
  if (!areas.length) return null
  ensureFenceLabelPane(map)
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

/** 设备标点 → 聚合图层的标点 (数据端总览、大屏共用) */
export function deviceClusterItem(
  d: Located,
  opts: { selected?: boolean; theme: 'light' | 'dark'; kind?: DeviceGlyphKind; onClick?: () => void },
): ClusterItem {
  const kind = opts.kind ?? deviceGlyphKind(d.typeName)
  const isCamera = kind === 'camera'
  return {
    id: d.id,
    lat: d.latitude,
    lng: d.longitude,
    icon: deviceMarkerIcon({
      name: d.name,
      online: d.online,
      alarms: d.alarms,
      kind,
      iconUrl: d.iconUrl,
      selected: opts.selected,
      theme: opts.theme,
    }),
    title: deviceMarkerTitle({ ...d, kind }),
    sig: `${d.name}|${d.online}|${d.alarms}|${kind}|${d.iconUrl ?? ''}|${opts.selected ? 1 : 0}`,
    alarm: !isCamera && d.alarms > 0,
    zIndexOffset: opts.selected ? 2000 : !isCamera && d.alarms > 0 ? 1000 : 0,
    onClick: opts.onClick,
  }
}

/** 设备标点 (FRONTEND_DESIGN §6 DeviceMap)：定位针 + 聚合 + 图例 + 电子围栏；点击标点选中设备；未定位的设备不显示 */
export function DeviceMap({
  devices,
  height = 320,
  fill = false,
  onSelect,
  selectedId,
  geofences = [],
  center,
  zoom,
}: {
  devices: DeviceMapPoint[]
  height?: number | string
  /** 地图区占满父级剩余高度；父级需是有确定高度的 flex / grid 容器 */
  fill?: boolean
  onSelect?: (id: number) => void
  selectedId?: number | null
  geofences?: MapGeofence[]
  /** 没有设备定位和围栏时的中心，[纬度, 经度] */
  center?: [number, number]
  zoom?: number
}) {
  const located = devices.filter(isLocated)
  const unlocated = devices.length - located.length
  const fenceLatLngs = geofences.flatMap((area) => area.ring.map(([lng, lat]) => [lat, lng] as [number, number]))
  const items = located.map((d) =>
    deviceClusterItem(d, {
      theme: 'light',
      selected: d.id === selectedId,
      onClick: onSelect ? () => onSelect(d.id) : undefined,
    }),
  )
  const map = (
    <TdtMap height={fill ? '100%' : height} center={center} zoom={center ? (zoom ?? 15) : zoom}>
      <GeofenceLayer areas={geofences} />
      <ClusterLayer items={items} />
      <FitBounds points={located} extra={fenceLatLngs} maxZoom={17} />
    </TdtMap>
  )
  return (
    <div className={fill ? 'layout-fill min-h-0 flex-1' : undefined}>
      <div className={fill ? 'relative isolate min-h-0 flex-1' : 'relative isolate'}>
        {fill ? <div className="absolute inset-0">{map}</div> : map}
        <MapLegend
          theme="light"
          items={['online', 'offline', 'alarm', 'cluster']}
          className="pointer-events-none absolute bottom-2 left-2 z-[1000]"
        />
      </div>
      {unlocated > 0 && (
        <div className="mt-2 shrink-0 text-fg-tertiary text-xs">{unlocated} 台设备未定位，不在地图上显示</div>
      )}
    </div>
  )
}
