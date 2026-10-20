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

type Located = DeviceMapPoint & { longitude: number; latitude: number }
const isLocated = (d: DeviceMapPoint): d is Located => d.longitude != null && d.latitude != null

/** 设备标点 → 聚合图层的标点 (数据端总览、大屏共用) */
export function deviceClusterItem(
  d: Located,
  opts: { selected?: boolean; theme: 'light' | 'dark'; kind?: DeviceGlyphKind; onClick?: () => void },
): ClusterItem {
  const kind = opts.kind ?? deviceGlyphKind(d.typeName)
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
    title: deviceMarkerTitle(d),
    sig: `${d.name}|${d.online}|${d.alarms}|${kind}|${d.iconUrl ?? ''}|${opts.selected ? 1 : 0}`,
    alarm: d.alarms > 0,
    zIndexOffset: opts.selected ? 2000 : d.alarms > 0 ? 1000 : 0,
    onClick: opts.onClick,
  }
}

/** 设备标点 (FRONTEND_DESIGN §6 DeviceMap)：定位针 + 聚合 + 图例；点击标点选中设备；未定位的设备不显示 */
export function DeviceMap({
  devices,
  height = 320,
  onSelect,
  selectedId,
}: {
  devices: DeviceMapPoint[]
  height?: number | string
  onSelect?: (id: number) => void
  selectedId?: number | null
}) {
  const located = devices.filter(isLocated)
  const unlocated = devices.length - located.length
  const items = located.map((d) =>
    deviceClusterItem(d, {
      theme: 'light',
      selected: d.id === selectedId,
      onClick: onSelect ? () => onSelect(d.id) : undefined,
    }),
  )
  return (
    <div>
      <div className="relative isolate">
        <TdtMap height={height}>
          <ClusterLayer items={items} />
          <FitBounds points={located} maxZoom={17} />
        </TdtMap>
        <MapLegend
          theme="light"
          items={['online', 'offline', 'alarm', 'cluster']}
          className="pointer-events-none absolute bottom-2 left-2 z-[1000]"
        />
      </div>
      {unlocated > 0 && <div className="mt-2 text-fg-tertiary text-xs">{unlocated} 台设备未定位，不在地图上显示</div>}
    </div>
  )
}
