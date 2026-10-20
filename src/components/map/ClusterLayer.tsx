import L, { type DivIcon } from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { clusterIcon } from './markers'

export interface ClusterItem {
  id: number | string
  lat: number
  lng: number
  icon: DivIcon
  /** 悬浮提示 / 读屏文字 */
  title: string
  /** 视觉状态签名 (状态、选中等)；签名不变时不重建标点 */
  sig: string
  /** 有告警：所在聚合外圈变红 */
  alarm?: boolean
  /** 选中、告警的标点放在上层 */
  zIndexOffset?: number
  onClick?: () => void
}

type ItemMarker = L.Marker & { siotAlarm?: boolean; siotId?: ClusterItem['id'] }

/**
 * 可聚合的标点图层 (leaflet.markercluster)：标点互相重叠时聚合，点击聚合放大展开；最大缩放级别仍重叠时展开为蜘蛛网
 * 标点用命令式创建 (DivIcon)，只在签名变化时重建，避免实时数据轮询导致的闪烁
 */
export function ClusterLayer({ items, maxClusterRadius = 48 }: { items: ClusterItem[]; maxClusterRadius?: number }) {
  const map = useMap()
  const groupRef = useRef<L.MarkerClusterGroup | null>(null)
  const clickRef = useRef(new Map<ClusterItem['id'], () => void>())
  clickRef.current = new Map(items.flatMap((it) => (it.onClick ? [[it.id, it.onClick] as const] : [])))

  useEffect(() => {
    const group = L.markerClusterGroup({
      maxClusterRadius,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      chunkedLoading: true,
      iconCreateFunction: (c) =>
        clusterIcon(
          c.getChildCount(),
          c.getAllChildMarkers().some((m) => (m as ItemMarker).siotAlarm),
        ),
    })
    map.addLayer(group)
    groupRef.current = group
    return () => {
      map.removeLayer(group)
      groupRef.current = null
    }
  }, [map, maxClusterRadius])

  const sig = items.map((it) => `${it.id}@${it.lat},${it.lng}:${it.sig}`).join('|')
  // biome-ignore lint/correctness/useExhaustiveDependencies: 只在标点签名变化时重建
  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    group.clearLayers()
    group.addLayers(
      items.map((it) => {
        const m: ItemMarker = L.marker([it.lat, it.lng], {
          icon: it.icon,
          title: it.title,
          alt: it.title,
          keyboard: true,
          riseOnHover: true,
          zIndexOffset: it.zIndexOffset ?? 0,
        })
        m.siotAlarm = Boolean(it.alarm)
        m.siotId = it.id
        m.on('click', () => clickRef.current.get(it.id)?.())
        m.on('keypress', (e: L.LeafletKeyboardEvent) => {
          if (e.originalEvent.key === 'Enter') clickRef.current.get(it.id)?.()
        })
        return m
      }),
    )
  }, [sig])

  return null
}
