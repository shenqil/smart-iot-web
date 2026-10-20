import 'leaflet/dist/leaflet.css'
import type { LatLngExpression, LeafletMouseEvent } from 'leaflet'
import type { ReactNode } from 'react'
import { LayersControl, MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import { useSysConfig } from '@/stores/sysConfig'
import { CHINA_CENTER, TDT_SUBDOMAINS, tdtTileUrl, useTdtBrowserKey } from './tianditu'

function ClickHandler({ onClick }: { onClick?: (lng: number, lat: number) => void }) {
  useMapEvents({ click: (e: LeafletMouseEvent) => onClick?.(e.latlng.lng, e.latlng.lat) })
  return null
}

export interface TdtMapProps {
  center?: LatLngExpression
  zoom?: number
  height?: number | string
  /** 默认影像底图 (大屏) 或矢量底图 */
  defaultLayer?: 'vec' | 'img'
  onClick?: (lng: number, lat: number) => void
  children?: ReactNode
}

/** 天地图底图 + 图层切换 (矢量 / 影像，均带注记)；未配置浏览器端 Key (前端系统配置) 时显示提示 */
export function TdtMap({
  center = CHINA_CENTER,
  zoom = 4,
  height = 400,
  defaultLayer = 'vec',
  onClick,
  children,
}: TdtMapProps) {
  const key = useTdtBrowserKey()
  const status = useSysConfig((s) => s.status)
  if (!key) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-md border border-line border-dashed bg-layout px-6 text-center text-fg-secondary text-sm"
      >
        {status === 'error'
          ? '前端系统配置加载失败，地图不可用 (刷新页面重试)，可直接输入经纬度。'
          : '未配置天地图浏览器端 Key (平台管理 › 系统配置 › frontend 的 tianditu.browserKey)，地图不可用，可直接输入经纬度。'}
      </div>
    )
  }
  return (
    <MapContainer center={center} zoom={zoom} style={{ height }} className="rounded-md" attributionControl={false}>
      <LayersControl position="topright">
        <LayersControl.BaseLayer name="矢量" checked={defaultLayer === 'vec'}>
          <TileLayer url={tdtTileUrl('vec', key)} subdomains={TDT_SUBDOMAINS} maxZoom={18} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="影像" checked={defaultLayer === 'img'}>
          <TileLayer url={tdtTileUrl('img', key)} subdomains={TDT_SUBDOMAINS} maxZoom={18} />
        </LayersControl.BaseLayer>
        <LayersControl.Overlay name="注记" checked>
          <TileLayer
            url={tdtTileUrl(defaultLayer === 'img' ? 'cia' : 'cva', key)}
            subdomains={TDT_SUBDOMAINS}
            maxZoom={18}
          />
        </LayersControl.Overlay>
      </LayersControl>
      <ClickHandler onClick={onClick} />
      {children}
    </MapContainer>
  )
}
