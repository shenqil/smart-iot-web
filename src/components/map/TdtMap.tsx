import 'leaflet/dist/leaflet.css'
import type { LatLngExpression, Map as LeafletMap, LeafletMouseEvent } from 'leaflet'
import { type ReactNode, type Ref, useEffect } from 'react'
import { LayersControl, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useSysConfig } from '@/stores/sysConfig'
import { CHINA_CENTER, TDT_SUBDOMAINS, tdtTileUrl, useTdtBrowserKey } from './tianditu'

function ClickHandler({ onClick }: { onClick?: (lng: number, lat: number) => void }) {
  useMapEvents({ click: (e: LeafletMouseEvent) => onClick?.(e.latlng.lng, e.latlng.lat) })
  return null
}

/** 缩放到 minZoom 及以上时给地图容器加 .siot-labels，设备标点常驻显示名称 (markers.css) */
function ZoomLabels({ minZoom }: { minZoom: number }) {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    const sync = () => el.classList.toggle('siot-labels', map.getZoom() >= minZoom)
    sync()
    map.on('zoomend', sync)
    return () => {
      map.off('zoomend', sync)
    }
  }, [map, minZoom])
  return null
}

export type TdtLayerName = 'vec' | 'img'

export interface TdtMapProps {
  center?: LatLngExpression
  zoom?: number
  height?: number | string
  /** 默认底图 (带图层切换时为初始值)：影像 (大屏) 或矢量 */
  defaultLayer?: TdtLayerName
  /** 受控底图 (隐藏内置图层切换、由外部按钮切换时使用) */
  layer?: TdtLayerName
  /** 右上角的矢量 / 影像切换，默认显示 */
  showLayerControl?: boolean
  zoomControl?: boolean
  /** 缩放到该级别及以上时设备标点常驻显示名称 */
  labelZoom?: number
  /** screen：大屏 (无圆角、暗色提示) */
  variant?: 'default' | 'screen'
  className?: string
  mapRef?: Ref<LeafletMap>
  onClick?: (lng: number, lat: number) => void
  children?: ReactNode
}

/** 天地图底图 + 图层切换 (矢量 / 影像，均带注记)；未配置浏览器端 Key (前端系统配置) 时显示提示 */
export function TdtMap({
  center = CHINA_CENTER,
  zoom = 4,
  height = 400,
  defaultLayer = 'vec',
  layer,
  showLayerControl = layer == null,
  zoomControl = true,
  labelZoom = 15,
  variant = 'default',
  className = '',
  mapRef,
  onClick,
  children,
}: TdtMapProps) {
  const key = useTdtBrowserKey()
  const status = useSysConfig((s) => s.status)
  const screen = variant === 'screen'
  if (!key) {
    return (
      <div
        style={{ height }}
        className={`flex items-center justify-center px-6 text-center text-sm ${
          screen
            ? 'bg-[#0b1a2a] text-white/60'
            : 'rounded-md border border-line border-dashed bg-layout text-fg-secondary'
        } ${className}`}
      >
        {status === 'error'
          ? '前端系统配置加载失败，地图不可用 (刷新页面重试)，可直接输入经纬度。'
          : '未配置天地图浏览器端 Key (平台管理 › 系统配置 › frontend 的 tianditu.browserKey)，地图不可用，可直接输入经纬度。'}
      </div>
    )
  }
  const current = layer ?? defaultLayer
  const tile = (name: 'vec' | 'cva' | 'img' | 'cia') => (
    <TileLayer key={name} url={tdtTileUrl(name, key)} subdomains={TDT_SUBDOMAINS} maxZoom={18} />
  )
  return (
    <MapContainer
      ref={mapRef}
      center={center}
      zoom={zoom}
      style={{ height }}
      className={`${screen ? '' : 'rounded-md'} ${className}`}
      attributionControl={false}
      zoomControl={zoomControl}
    >
      {showLayerControl ? (
        <LayersControl position="topright">
          <LayersControl.BaseLayer name="矢量" checked={current === 'vec'}>
            {tile('vec')}
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="影像" checked={current === 'img'}>
            {tile('img')}
          </LayersControl.BaseLayer>
          <LayersControl.Overlay name="注记" checked>
            {tile(current === 'img' ? 'cia' : 'cva')}
          </LayersControl.Overlay>
        </LayersControl>
      ) : (
        <>
          {tile(current)}
          {tile(current === 'img' ? 'cia' : 'cva')}
        </>
      )}
      <ClickHandler onClick={onClick} />
      <ZoomLabels minZoom={labelZoom} />
      {children}
    </MapContainer>
  )
}
