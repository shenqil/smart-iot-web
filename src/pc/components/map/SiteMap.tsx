import { Tag } from 'antd'
import { latLngBounds } from 'leaflet'
import { useEffect } from 'react'
import { Marker, Popup, useMap } from 'react-leaflet'
import { Link } from 'react-router'
import { joinAddress } from '@/lib/address'
import { MapLegend } from './MapLegend'
import { siteMarkerIcon, siteMarkerTitle } from './markers'
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

/** 园区状态：方牌颜色见 markers.css，弹窗里同时显示文字标签 */
const STATUS_STYLE: Record<string, { label: string; tag: string }> = {
  active: { label: '运营中', tag: 'success' },
  under_construction: { label: '建设中', tag: 'warning' },
  inactive: { label: '停用', tag: 'default' },
}

type Located = SiteMapPoint & { longitude: number; latitude: number }
const isLocated = (s: SiteMapPoint): s is Located => s.longitude != null && s.latitude != null

/**
 * 视野自动包含全部标点 (只在标点集合变化时调整，用户拖动缩放后不打扰)
 * 标点在锚点上方 (定位针约 56px、园区方牌约 70px)，上边距留大一些；大屏用 padding 让出两侧面板
 */
export function FitBounds({
  points,
  paddingTopLeft = [40, 84],
  paddingBottomRight = [40, 24],
  maxZoom = 13,
}: {
  points: { id: number; latitude: number; longitude: number }[]
  paddingTopLeft?: [number, number]
  paddingBottomRight?: [number, number]
  maxZoom?: number
}) {
  const map = useMap()
  const sig = points.map((p) => `${p.id}:${p.longitude},${p.latitude}`).join('|')
  // biome-ignore lint/correctness/useExhaustiveDependencies: 只在标点集合 (sig) 变化时调整视野
  useEffect(() => {
    if (!points.length) return
    const bounds = latLngBounds(points.map((p) => [p.latitude, p.longitude]))
    map.fitBounds(bounds, { paddingTopLeft, paddingBottomRight, maxZoom })
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
      <div className="relative isolate">
        <TdtMap height={height}>
          {located.map((s) => {
            const st = STATUS_STYLE[s.status] ?? STATUS_STYLE.inactive
            return (
              <Marker
                key={s.id}
                position={[s.latitude, s.longitude]}
                icon={siteMarkerIcon({ name: s.name, status: s.status, theme: 'light' })}
                title={siteMarkerTitle(s)}
                alt={siteMarkerTitle(s)}
              >
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
              </Marker>
            )
          })}
          <FitBounds points={located} />
        </TdtMap>
        {located.length > 1 && (
          <MapLegend theme="light" items={['site']} className="pointer-events-none absolute bottom-2 left-2 z-[1000]" />
        )}
      </div>
      {unlocated > 0 && (
        <div className="mt-2 text-fg-tertiary text-xs">
          {unlocated} 个园区未定位，不在地图上显示 (编辑园区时可地图选点)
        </div>
      )}
    </div>
  )
}
