/**
 * 天地图 (FRONTEND_DESIGN §6)
 * - 瓦片：浏览器端 Key (VITE_TDT_BROWSER_KEY，绑定域名)
 * - 搜索 / 逆地理编码：经 /tdt-api 代理，由 Nginx / Vite 追加服务端 Key，不暴露给浏览器
 * - 坐标：CGCS2000 ≈ WGS84，后端存 WGS84，不做纠偏
 */
export const TDT_BROWSER_KEY = import.meta.env.VITE_TDT_BROWSER_KEY || ''
export const hasTdtKey = Boolean(TDT_BROWSER_KEY)

export type TdtLayer = 'vec' | 'cva' | 'img' | 'cia'

export const tdtTileUrl = (layer: TdtLayer) =>
  `https://t{s}.tianditu.gov.cn/${layer}_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}` +
  `&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TDT_BROWSER_KEY}`

export const TDT_SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7']

/** 中国大致中心 (未选点时的地图中心) */
export const CHINA_CENTER: [number, number] = [35.0, 105.0]

export interface PlaceResult {
  name: string
  address: string
  longitude: number
  latitude: number
}

/** 地名搜索 v2 (普通搜索) */
export async function searchPlace(keyword: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const postStr = JSON.stringify({
    keyWord: keyword,
    level: 12,
    mapBound: '73,3,136,54',
    queryType: 1,
    start: 0,
    count: 10,
  })
  const res = await fetch(`/tdt-api/v2/search?postStr=${encodeURIComponent(postStr)}&type=query`, { signal })
  if (!res.ok) throw new Error(`地名搜索失败 (${res.status})`)
  const data = (await res.json()) as { pois?: { name: string; address?: string; lonlat: string }[] }
  return (data.pois ?? []).flatMap((p) => {
    const [lng, lat] = p.lonlat.split(/[ ,]/).map(Number)
    return Number.isFinite(lng) && Number.isFinite(lat)
      ? [{ name: p.name, address: p.address ?? '', longitude: lng, latitude: lat }]
      : []
  })
}

export interface ReverseGeocode {
  address: string
  province: string
  city: string
  district: string
}

/** 逆地理编码：坐标 → 省 / 市 / 区 / 地址 (园区表单回填用) */
export async function reverseGeocode(longitude: number, latitude: number): Promise<ReverseGeocode | null> {
  const postStr = JSON.stringify({ lon: longitude, lat: latitude, ver: 1 })
  const res = await fetch(`/tdt-api/geocoder?postStr=${encodeURIComponent(postStr)}&type=geocode`)
  if (!res.ok) return null
  const data = (await res.json()) as {
    result?: { formatted_address?: string; addressComponent?: { province?: string; city?: string; county?: string } }
  }
  const r = data.result
  if (!r) return null
  return {
    address: r.formatted_address ?? '',
    province: r.addressComponent?.province ?? '',
    city: r.addressComponent?.city ?? '',
    district: r.addressComponent?.county ?? '',
  }
}

/** 经纬度合法性 (与后端 minimum / maximum 一致) */
export const isValidLngLat = (lng: unknown, lat: unknown) =>
  typeof lng === 'number' && typeof lat === 'number' && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
