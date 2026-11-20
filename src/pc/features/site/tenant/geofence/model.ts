import type { GeoJSONStoreFeatures } from 'terra-draw'
import { isValidLngLat } from '@/lib/tianditu'

/** 写在园区 properties 里的键。后端不解析，只整包保存。 */
export const GEOFENCE_KEY = 'geofences'

/** 一个园区最多这么多块区域，避免地图上拖出失控的数量 */
export const MAX_GEOFENCE_AREAS = 30

export interface GeofenceArea {
  id: string
  name: string
  /** WGS84，[经度, 纬度]，不重复首尾，至少 3 个点 */
  ring: [number, number][]
}

export type LngLat = [number, number]

export interface DrawFeature {
  id?: string | number
  properties?: Record<string, unknown> | null
  geometry: { type: string; coordinates: unknown }
}

const AREA_MODES = new Set(['polygon', 'rectangle'])

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

const point = (v: unknown): [number, number] | null => {
  if (!Array.isArray(v) || v.length < 2) return null
  const lng = v[0]
  const lat = v[1]
  return isValidLngLat(lng, lat) ? [lng, lat] : null
}

/** 去掉闭合点，留下至少 3 个有效顶点；不合法返回 null */
export function openRing(points: unknown): [number, number][] | null {
  if (!Array.isArray(points)) return null
  const ring: [number, number][] = []
  for (const item of points) {
    const p = point(item)
    if (!p) return null
    ring.push(p)
  }
  if (ring.length >= 2) {
    const first = ring[0]
    const last = ring[ring.length - 1]
    if (first[0] === last[0] && first[1] === last[1]) ring.pop()
  }
  return ring.length >= 3 ? ring : null
}

function ringOf(geometry: DrawFeature['geometry']): [number, number][] | null {
  if (geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates)) return null
  return openRing(geometry.coordinates[0])
}

function freshName(taken: Set<string>) {
  let n = 1
  while (taken.has(`区域 ${n}`)) n += 1
  const name = `区域 ${n}`
  taken.add(name)
  return name
}

/** 从园区 properties 读出围栏。形状不对的区域丢掉，避免脏数据把页面打崩。 */
export function parseGeofences(properties: unknown): GeofenceArea[] {
  if (!isRecord(properties)) return []
  const doc = properties[GEOFENCE_KEY]
  if (!isRecord(doc) || !Array.isArray(doc.areas)) return []
  const areas: GeofenceArea[] = []
  for (const item of doc.areas) {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id) continue
    const ring = openRing(item.ring)
    if (!ring) continue
    const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : `区域 ${areas.length + 1}`
    areas.push({ id: item.id, name, ring })
    if (areas.length >= MAX_GEOFENCE_AREAS) break
  }
  return areas
}

/** 合并进现有 properties。PUT 会整包替换，其他键必须保留。 */
export function withGeofences(properties: unknown, areas: GeofenceArea[]): Record<string, unknown> {
  const base = isRecord(properties) ? { ...properties } : {}
  return {
    ...base,
    [GEOFENCE_KEY]: {
      version: 1,
      areas: areas.map((area) => ({ id: area.id, name: area.name, ring: area.ring })),
    },
  }
}

export function geofenceSignature(areas: GeofenceArea[]) {
  return JSON.stringify(areas.map((area) => ({ id: area.id, name: area.name.trim(), ring: area.ring })))
}

/** 保存前补上空白名称，并丢掉多余字段 */
export function normalizeAreas(areas: GeofenceArea[]): GeofenceArea[] {
  const taken = new Set<string>()
  return areas.map((area) => {
    const trimmed = area.name.trim()
    const name = trimmed || freshName(taken)
    if (trimmed) taken.add(name)
    return { id: area.id, name, ring: area.ring }
  })
}

/** Terra Draw 快照里的多边形 / 矩形转成区域。名称按 id 从上次编辑保留。 */
export function areasFromSnapshot(features: DrawFeature[], names: ReadonlyMap<string, string>): GeofenceArea[] {
  const taken = new Set<string>(names.values())
  const areas: GeofenceArea[] = []
  for (const feature of features) {
    const mode = feature.properties?.mode
    if (typeof mode !== 'string' || !AREA_MODES.has(mode)) continue
    const ring = ringOf(feature.geometry)
    if (!ring || feature.id == null) continue
    const id = String(feature.id)
    const kept = names.get(id)?.trim() ?? ''
    const propName = typeof feature.properties?.name === 'string' ? feature.properties.name.trim() : ''
    const name = kept || propName || freshName(taken)
    taken.add(name)
    areas.push({ id, name, ring })
  }
  return areas
}

export function closeRing(ring: [number, number][]): [number, number][] {
  if (!ring.length) return ring
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) return ring
  return [...ring, [first[0], first[1]]]
}

/** 载入 Terra Draw 时按多边形写入，矩形只是四个顶点 */
export function areaFeature(area: GeofenceArea): GeoJSONStoreFeatures {
  return {
    type: 'Feature',
    id: area.id,
    properties: { mode: 'polygon', name: area.name },
    geometry: { type: 'Polygon', coordinates: [closeRing(area.ring)] },
  }
}

export function lngLatOf(d: { longitude: number | null; latitude: number | null }): LngLat | null {
  if (d.longitude == null || d.latitude == null || !isValidLngLat(d.longitude, d.latitude)) return null
  return [d.longitude, d.latitude]
}

export function sameLngLat(a: LngLat | null, b: LngLat | null) {
  if (a == null || b == null) return a === b
  return Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7
}

/** 相对原始坐标有改动、并且已经落在地图上的设备 */
export function changedPositions(
  originals: ReadonlyMap<number, LngLat | null>,
  drafts: ReadonlyMap<number, LngLat | null>,
) {
  const moved: { id: number; longitude: number; latitude: number }[] = []
  for (const [id, draft] of drafts) {
    if (draft == null || sameLngLat(originals.get(id) ?? null, draft)) continue
    moved.push({ id, longitude: draft[0], latitude: draft[1] })
  }
  return moved
}
