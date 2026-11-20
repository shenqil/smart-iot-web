import * as L from 'leaflet'
import { type Map as LeafletMap, latLngBounds } from 'leaflet'
import { type Ref, useEffect, useImperativeHandle, useRef } from 'react'
import { useMap } from 'react-leaflet'
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawSelectMode,
  ValidateNotSelfIntersecting,
} from 'terra-draw'
import { TerraDrawLeafletAdapter } from 'terra-draw-leaflet-adapter'
import { notify } from '@/app/notify'
import { areaFeature, areasFromSnapshot, type GeofenceArea, geofenceSignature, MAX_GEOFENCE_AREAS } from './model'

export interface FenceMapHandle {
  remove: (id: string) => void
  select: (id: string) => void
}

const FILL = '#06b6d4'
const OUTLINE = '#0891b2'

const polygonStyles = {
  fillColor: FILL,
  fillOpacity: 0.22,
  outlineColor: OUTLINE,
  outlineWidth: 2,
} as const

/**
 * 围栏绘制。只在「编辑围栏」时挂上，避免和设备拖拽抢同一层指针事件。
 * 区域名称留在 React 状态里，按 Terra Draw 的要素 id 对上。
 */
export function FenceMap({
  ref,
  areas,
  tool,
  onAreas,
  onSelect,
}: {
  ref?: Ref<FenceMapHandle>
  areas: GeofenceArea[]
  tool: 'rectangle' | 'polygon' | 'select'
  onAreas: (areas: GeofenceArea[]) => void
  onSelect: (id: string | null) => void
}) {
  const map = useMap()
  const areasRef = useRef(areas)
  const namesRef = useRef(new Map<string, string>())
  const onAreasRef = useRef(onAreas)
  const onSelectRef = useRef(onSelect)
  const toolRef = useRef(tool)
  const drawRef = useRef<TerraDraw | null>(null)
  areasRef.current = areas
  namesRef.current = new Map(areas.map((area) => [area.id, area.name]))
  onAreasRef.current = onAreas
  onSelectRef.current = onSelect
  toolRef.current = tool

  useImperativeHandle(ref, () => ({
    remove: (id) => drawRef.current?.removeFeatures([id]),
    select: (id) => {
      const draw = drawRef.current
      if (!draw?.enabled) return
      try {
        draw.selectFeature(id)
      } catch {
        // 正在画下一块时选不中已有区域
      }
    },
  }))

  useEffect(() => {
    map.doubleClickZoom.disable()
    const draw = new TerraDraw({
      adapter: new TerraDrawLeafletAdapter({ lib: leafletNamespace(), map }),
      modes: [
        new TerraDrawRectangleMode({ styles: polygonStyles, validation: ValidateNotSelfIntersecting }),
        new TerraDrawPolygonMode({
          styles: {
            ...polygonStyles,
            closingPointColor: '#ffffff',
            closingPointWidth: 4,
            closingPointOutlineColor: OUTLINE,
            closingPointOutlineWidth: 2,
          },
          validation: ValidateNotSelfIntersecting,
        }),
        new TerraDrawSelectMode({
          flags: {
            polygon: {
              feature: { draggable: true, coordinates: { midpoints: true, draggable: true, deletable: true } },
            },
            rectangle: {
              feature: { draggable: true, coordinates: { midpoints: true, draggable: true, deletable: true } },
            },
          },
          styles: {
            selectedPolygonColor: FILL,
            selectedPolygonFillOpacity: 0.28,
            selectedPolygonOutlineColor: '#0e7490',
            selectedPolygonOutlineWidth: 2,
            selectionPointColor: '#ffffff',
            selectionPointWidth: 6,
            selectionPointOutlineColor: OUTLINE,
            selectionPointOutlineWidth: 2,
            midPointColor: '#ffffff',
            midPointWidth: 5,
            midPointOutlineColor: OUTLINE,
            midPointOutlineWidth: 2,
          },
        }),
      ],
    })
    drawRef.current = draw
    const published = { sig: '' }
    let ready = false
    const publish = (limit: boolean) => {
      if (!ready) return
      const snapshot = draw.getSnapshot()
      if (draw.getModeState() !== 'drawing') {
        const invalid = snapshot.flatMap((feature) => {
          const mode = feature.properties?.mode
          if (typeof mode !== 'string' || (mode !== 'polygon' && mode !== 'rectangle') || feature.id == null) return []
          const kept = areasFromSnapshot([feature], namesRef.current)
          return kept.length ? [] : [feature.id]
        })
        if (invalid.length) {
          draw.removeFeatures(invalid)
          return
        }
      }
      let next = areasFromSnapshot(snapshot, namesRef.current)
      if (limit && next.length > MAX_GEOFENCE_AREAS) {
        notify.warning(`一个园区最多 ${MAX_GEOFENCE_AREAS} 块区域`)
        draw.removeFeatures(next.slice(MAX_GEOFENCE_AREAS).map((area) => area.id))
        next = next.slice(0, MAX_GEOFENCE_AREAS)
      }
      const sig = geofenceSignature(next)
      if (sig === published.sig) return
      published.sig = sig
      onAreasRef.current(next)
    }
    draw.on('change', () => publish(false))
    draw.on('finish', () => publish(true))
    draw.on('select', (id) => onSelectRef.current(String(id)))
    draw.on('deselect', () => onSelectRef.current(null))
    draw.start()
    const initial = areasRef.current
    if (initial.length) {
      const loaded = draw.addFeatures(initial.map(areaFeature))
      const remapped = initial.flatMap((area, index) => {
        const row = loaded[index]
        if (!row?.valid || row.id == null) return []
        return [{ ...area, id: String(row.id) }]
      })
      const changed =
        remapped.length !== initial.length || remapped.some((area, index) => area.id !== initial[index]?.id)
      if (changed) {
        namesRef.current = new Map(remapped.map((area) => [area.id, area.name]))
        published.sig = geofenceSignature(remapped)
        onAreasRef.current(remapped)
      } else {
        published.sig = geofenceSignature(initial)
      }
    }
    ready = true
    draw.setMode(toolRef.current)
    const points = initial.flatMap((area) => area.ring.map(([lng, lat]) => [lat, lng] as [number, number]))
    fitGeofence(map, points)
    return () => {
      draw.stop()
      drawRef.current = null
      map.doubleClickZoom.enable()
    }
  }, [map])

  useEffect(() => {
    const draw = drawRef.current
    if (!draw?.enabled || draw.getMode() === tool) return
    draw.setMode(tool)
  }, [tool])

  return null
}

export function fitGeofence(map: LeafletMap, points: [number, number][]) {
  map.invalidateSize()
  if (!points.length) return
  if (points.length === 1) {
    map.setView(points[0], 16)
    return
  }
  map.fitBounds(latLngBounds(points), { padding: [48, 48], maxZoom: 17 })
}

/** Vite 把 leaflet 的 CJS 导出挂在命名空间或 default 上，两种都接住 */
function leafletNamespace() {
  const named = L as typeof L & { default?: typeof L }
  const lib = typeof named.geoJSON === 'function' ? named : named.default
  if (!lib) throw new Error('Leaflet 未正确加载')
  return lib
}
