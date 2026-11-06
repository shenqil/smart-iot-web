import { useQuery } from '@tanstack/react-query'
import { Button, SearchBar } from 'antd-mobile'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import type { AppDevice } from '@shared/api/device'
import { useDeviceTypes } from '@shared/api/dict'
import { appSitesQuery } from '@shared/api/site'
import { isValidLngLat, TDT_SUBDOMAINS, tdtTileUrl, useTdtBrowserKey } from '@shared/lib/tianditu'
import { isVideoDeviceType } from '@shared/telemetry/lib/realtime'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { Link, useSearchParams } from 'react-router'
import { useCompanyId } from '@/hooks/session'
import { mapDevicesQuery } from '../api'
import { positiveId } from '../filters'
import { Card, Choice, Empty, Failure, Loading, LocalErrorBoundary, Page, showFailure } from '../ui'

export default function MapPage() {
  const cid = useCompanyId(),
    [params, setParams] = useSearchParams(),
    site = positiveId(params.get('siteId')),
    q = useQuery(mapDevicesQuery(cid, site)),
    sites = useQuery(appSitesQuery(cid)),
    key = useTdtBrowserKey(),
    types = useDeviceTypes()
  const [keyword, setKeyword] = useState(''),
    [selectedId, setSelectedId] = useState<number | null>(null),
    [target, setTarget] = useState<[number, number] | null>(null),
    [satellite, setSatellite] = useState(false),
    [tileError, setTileError] = useState(false)
  const rows = useMemo(
      () =>
        (q.data ?? []).filter(
          (d) => !keyword || `${d.name} ${d.deviceSn}`.toLowerCase().includes(keyword.toLowerCase()),
        ),
      [q.data, keyword],
    ),
    points = useMemo(() => rows.filter((d) => isValidLngLat(d.longitude, d.latitude)), [rows])
  const select = useCallback((d: AppDevice) => setSelectedId(d.id), [])
  const selected = rows.find((d) => d.id === selectedId)
  // biome-ignore lint/correctness/useExhaustiveDependencies: changing site clears the old map selection
  useEffect(() => {
    setSelectedId(null)
    setTarget(null)
  }, [site])
  return (
    <Page title="园区设备地图">
      <div className="h5-map-tools">
        <SearchBar placeholder="搜索设备名称 / SN" value={keyword} onChange={setKeyword} />
        <Choice
          label="园区"
          value={site ? String(site) : ''}
          options={[
            { label: '全部园区', value: '' },
            ...(sites.data ?? []).map((s) => ({ label: s.name, value: String(s.id) })),
          ]}
          onChange={(v) => setParams(v ? { siteId: v } : {})}
        />
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <Failure error={q.error} retry={() => void q.refetch()} />
      ) : (
        <>
          <p className="h5-muted">
            {rows.length} 台设备 · 可定位 {points.length} 台 · 无坐标 {rows.length - points.length} 台
          </p>
          {!key ? (
            <Card>
              <p>地图服务尚未配置。可在下方查看设备并进入详情。</p>
            </Card>
          ) : !points.length ? (
            <Empty title="当前范围暂无可定位设备" />
          ) : (
            <LocalErrorBoundary fallbackTitle="地图渲染异常">
              <div className="h5-map">
                <MapContainer center={[points[0].latitude ?? 0, points[0].longitude ?? 0]} zoom={12} attributionControl>
                  <TileLayer
                    key={`${satellite}:${key}`}
                    url={tdtTileUrl(satellite ? 'img' : 'vec', key)}
                    subdomains={TDT_SUBDOMAINS}
                    attribution="天地图"
                    eventHandlers={{ tileerror: () => setTileError(true), load: () => setTileError(false) }}
                  />
                  <TileLayer
                    key={`label:${satellite}:${key}`}
                    url={tdtTileUrl(satellite ? 'cia' : 'cva', key)}
                    subdomains={TDT_SUBDOMAINS}
                  />
                  <Markers devices={points} select={select} target={target} nameOf={types.nameOf} />
                </MapContainer>
              </div>
            </LocalErrorBoundary>
          )}
          {tileError && <p className="h5-warning">地图瓦片加载失败，请检查网络或地图密钥授权；设备列表仍可使用。</p>}
          <div className="h5-row">
            <Button size="small" onClick={() => setSatellite((v) => !v)}>
              {satellite ? '切换矢量' : '切换卫星'}
            </Button>
            <Button
              size="small"
              onClick={() => {
                const currentSite = sites.data?.find((s) => s.id === site)
                if (currentSite && isValidLngLat(currentSite.longitude, currentSite.latitude)) {
                  setTarget([currentSite.latitude ?? 0, currentSite.longitude ?? 0])
                  return
                }
                if (points.length) {
                  setTarget([
                    points.reduce((n, d) => n + (d.latitude ?? 0), 0) / points.length,
                    points.reduce((n, d) => n + (d.longitude ?? 0), 0) / points.length,
                  ])
                  return
                }
                showFailure(new Error('当前园区尚未配置中心坐标'))
              }}
            >
              回园区中心
            </Button>
          </div>
          {selected && (
            <Card
              title={selected.name}
              extra={
                <Button size="mini" fill="none" onClick={() => setSelectedId(null)}>
                  关闭
                </Button>
              }
            >
              <p>
                {types.nameOf(selected.deviceTypeId)} · {selected.deviceSn} ·{' '}
                {isVideoDeviceType(types.nameOf(selected.deviceTypeId))
                  ? '在线'
                  : selected.onlineKnown === false
                    ? '状态未知'
                    : selected.online
                      ? '在线'
                      : '离线'}
                {!isVideoDeviceType(types.nameOf(selected.deviceTypeId)) && selected.hasAlarm ? ' · 有未处理告警' : ''}
              </p>
              {!isVideoDeviceType(types.nameOf(selected.deviceTypeId)) && selected.hasAlarm && (
                <Link
                  className="h5-navigation-card"
                  to={`/h5/${cid}/alarms?deviceId=${selected.id}&processed=false${site ? `&siteId=${site}` : ''}`}
                >
                  查看设备告警 ›
                </Link>
              )}
              <Link
                className="h5-navigation-card"
                to={`/h5/${cid}/devices?deviceId=${selected.id}${site ? `&siteId=${site}` : ''}`}
              >
                查看设备详情 ›
              </Link>
            </Card>
          )}
          <Card title="设备定位列表">
            {!rows.length ? (
              <Empty title="没有匹配的设备" />
            ) : (
              rows.map((d) => (
                <div className="h5-list-link h5-row" key={d.id}>
                  <Link to={`/h5/${cid}/devices?deviceId=${d.id}${site ? `&siteId=${site}` : ''}`}>
                    {d.name}
                    <small className="h5-muted">
                      {' '}
                      {types.nameOf(d.deviceTypeId)} · {d.deviceSn}
                      {!isVideoDeviceType(types.nameOf(d.deviceTypeId)) && d.hasAlarm ? ' · 待处理告警' : ''}
                    </small>
                  </Link>
                  {isValidLngLat(d.longitude, d.latitude) ? (
                    <Button
                      size="mini"
                      onClick={() => {
                        setSelectedId(d.id)
                        setTarget([d.latitude ?? 0, d.longitude ?? 0])
                      }}
                    >
                      定位
                    </Button>
                  ) : (
                    <small className="h5-muted">未设置坐标</small>
                  )}
                </div>
              ))
            )}
          </Card>
        </>
      )}
    </Page>
  )
}
function Markers({
  devices,
  select,
  target,
  nameOf,
}: {
  devices: AppDevice[]
  select: (d: AppDevice) => void
  target: [number, number] | null
  nameOf: (id: number | null | undefined) => string
}) {
  const map = useMap()
  useEffect(() => {
    const group = L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 45 })
    for (const d of devices) {
      const isVideo = isVideoDeviceType(nameOf(d.deviceTypeId))
      const marker = L.marker([d.latitude ?? 0, d.longitude ?? 0], {
        icon: L.divIcon({
          html: `<span class="h5-map-dot ${!isVideo && d.hasAlarm ? 'has-alarm' : ''} ${isVideo || d.online ? 'online' : ''}"></span>`,
          className: 'h5-marker',
          iconSize: [28, 28],
        }),
      })
      marker.on('click', () => select(d))
      group.addLayer(marker)
    }
    map.addLayer(group)
    if (devices.length) map.fitBounds(group.getBounds(), { padding: [30, 30], maxZoom: 15 })
    return () => {
      group.clearLayers()
      map.removeLayer(group)
    }
  }, [devices, map, select, nameOf])
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 15))
  }, [target, map])
  return null
}
