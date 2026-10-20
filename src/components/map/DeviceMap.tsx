import { CircleMarker, Tooltip } from 'react-leaflet'
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
}

type Located = DeviceMapPoint & { longitude: number; latitude: number }
const isLocated = (d: DeviceMapPoint): d is Located => d.longitude != null && d.latitude != null

/** 标点样式：在线实心、离线空心、有告警红色并加大；悬浮提示同时给出文字状态 */
function style(d: DeviceMapPoint) {
  if (d.alarms > 0)
    return { radius: 10, color: '#fff', fillColor: '#e34948', fillOpacity: 0.95, label: `⚠ ${d.alarms} 条未处理告警` }
  if (d.online) return { radius: 8, color: '#fff', fillColor: '#0f766e', fillOpacity: 0.9, label: '● 在线' }
  return { radius: 7, color: '#94a3b8', fillColor: '#fff', fillOpacity: 1, label: '○ 离线' }
}

/** 设备标点 (FRONTEND_DESIGN §6 DeviceMap)：点击标点选中设备；未定位的设备不显示 */
export function DeviceMap({
  devices,
  height = 320,
  onSelect,
}: {
  devices: DeviceMapPoint[]
  height?: number | string
  onSelect?: (id: number) => void
}) {
  const located = devices.filter(isLocated)
  const unlocated = devices.length - located.length
  return (
    <div>
      <TdtMap height={height}>
        {located.map((d) => {
          const st = style(d)
          return (
            <CircleMarker
              key={d.id}
              center={[d.latitude, d.longitude]}
              radius={st.radius}
              pathOptions={{ color: st.color, weight: 2, fillColor: st.fillColor, fillOpacity: st.fillOpacity }}
              eventHandlers={{ click: () => onSelect?.(d.id) }}
            >
              <Tooltip>
                {d.name}　{st.label}
              </Tooltip>
            </CircleMarker>
          )
        })}
        <FitBounds points={located} />
      </TdtMap>
      {unlocated > 0 && <div className="mt-2 text-fg-tertiary text-xs">{unlocated} 台设备未定位，不在地图上显示</div>}
    </div>
  )
}
