import { Tag } from 'antd'
import { latLngBounds } from 'leaflet'
import { useEffect } from 'react'
import { CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet'
import { Link } from 'react-router'
import { joinAddress } from '@/lib/address'
import { TdtMap } from './TdtMap'

export interface SiteMapPoint {
  id: number
  name: string
  status: string
  longitude: number | null
  latitude: number | null
  province?: string
  city?: string
  district?: string
  address?: string
}

/** 园区状态：颜色 + 文字 (标点悬浮显示名称与状态，不只靠颜色区分) */
const STATUS_STYLE: Record<string, { color: string; label: string; tag: string }> = {
  active: { color: '#0f766e', label: '运营中', tag: 'success' },
  under_construction: { color: '#d97706', label: '建设中', tag: 'warning' },
  inactive: { color: '#94a3b8', label: '停用', tag: 'default' },
}

type Located = SiteMapPoint & { longitude: number; latitude: number }
const isLocated = (s: SiteMapPoint): s is Located => s.longitude != null && s.latitude != null

/** 视野自动包含全部标点 (只在标点集合变化时调整，用户拖动缩放后不打扰) */
function FitBounds({ points }: { points: Located[] }) {
  const map = useMap()
  const sig = points.map((p) => `${p.id}:${p.longitude},${p.latitude}`).join('|')
  // biome-ignore lint/correctness/useExhaustiveDependencies: 只在标点集合 (sig) 变化时调整视野
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 13)
      return
    }
    map.fitBounds(latLngBounds(points.map((p) => [p.latitude, p.longitude])), { padding: [32, 32], maxZoom: 13 })
  }, [sig, map])
  return null
}

/**
 * 园区分布 (FRONTEND_DESIGN §6 SiteMap)：标点弹出名称、状态、地址与"进入详情"
 * 未定位的园区不在地图上显示，地图下方提示数量
 */
export function SiteMap({
  sites,
  height = 320,
  detailPath,
}: {
  sites: SiteMapPoint[]
  height?: number | string
  /** 园区详情地址；不传则弹窗不显示"进入详情" */
  detailPath?: (id: number) => string
}) {
  const located = sites.filter(isLocated)
  const unlocated = sites.length - located.length
  return (
    <div>
      <TdtMap height={height}>
        {located.map((s) => {
          const st = STATUS_STYLE[s.status] ?? STATUS_STYLE.inactive
          return (
            <CircleMarker
              key={s.id}
              center={[s.latitude, s.longitude]}
              radius={9}
              pathOptions={{ color: '#fff', weight: 2, fillColor: st.color, fillOpacity: 0.9 }}
            >
              <Tooltip>
                {s.name} · {st.label}
              </Tooltip>
              <Popup>
                <div className="min-w-44">
                  <div className="mb-1 flex items-center gap-2 font-medium">
                    {s.name}
                    <Tag color={st.tag} className="m-0">
                      {st.label}
                    </Tag>
                  </div>
                  <div className="text-fg-secondary text-xs">{joinAddress(s) || '未填写地址'}</div>
                  {detailPath && (
                    <Link to={detailPath(s.id)} className="mt-2 inline-block">
                      进入详情 ›
                    </Link>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
        <FitBounds points={located} />
      </TdtMap>
      {unlocated > 0 && (
        <div className="mt-2 text-fg-tertiary text-xs">
          {unlocated} 个园区未定位，不在地图上显示 (编辑园区时可地图选点)
        </div>
      )}
    </div>
  )
}
