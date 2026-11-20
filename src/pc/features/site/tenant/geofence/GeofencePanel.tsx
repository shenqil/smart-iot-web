import {
  AimOutlined,
  BorderOutlined,
  CloseOutlined,
  DeleteOutlined,
  DragOutlined,
  EnvironmentOutlined,
  HighlightOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Empty, Input, Segmented, Spin } from 'antd'
import type { Marker as LeafletMarker } from 'leaflet'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Marker, Polygon, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { useBlocker } from 'react-router'
import { fetchAllPages } from '@/api/page'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'
import { deviceGlyphKind, deviceMarkerIcon, deviceMarkerTitle } from '@/components/map/markers'
import { TdtMap } from '@/components/map/TdtMap'
import { tenantDeviceConfigApi } from '@/features/device/config/api'
import { useDeviceTypes } from '@/features/dict/api'
import { useCompanyId } from '@/hooks/session'
import { invalidateTenant } from '@/lib/tenant'
import { CHINA_CENTER } from '@/lib/tianditu'
import { type SiteDetail, type SiteDevice, tenantSiteApi, tenantSiteKeys } from '../api'
import { FenceMap, type FenceMapHandle, fitGeofence } from './FenceMap'
import {
  changedPositions,
  type GeofenceArea,
  geofenceSignature,
  type LngLat,
  lngLatOf,
  normalizeAreas,
  parseGeofences,
  withGeofences,
} from './model'

/** 页签栏右侧的保存按钮，由园区详情页渲染 */
export interface FenceChrome {
  savedCount: number
  dirty: boolean
  saving: boolean
  canSave: boolean
  saveLabel: string
  save: () => void
}

type Mode = 'fence' | 'device'
type Tool = 'rectangle' | 'polygon' | 'select'

/** 园区电子围栏：区域写进 properties.geofences，设备位置走原有的设备更新接口 */
export function GeofencePanel({
  site,
  onChrome,
}: {
  site: SiteDetail
  onChrome?: (chrome: FenceChrome | null) => void
}) {
  const cid = useCompanyId()
  const qc = useQueryClient()
  const fenceRef = useRef<FenceMapHandle>(null)
  const [areas, setAreas] = useState(() => parseGeofences(site.properties))
  const [baseline, setBaseline] = useState(() => geofenceSignature(parseGeofences(site.properties)))
  const [savedCount, setSavedCount] = useState(() => parseGeofences(site.properties).length)
  const [mode, setMode] = useState<Mode>('fence')
  const [tool, setTool] = useState<Tool>('rectangle')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [placingId, setPlacingId] = useState<number | null>(null)
  const [positions, setPositions] = useState<Map<number, LngLat | null>>(new Map())
  const [saving, setSaving] = useState(false)
  const originals = useRef<Map<number, LngLat | null>>(new Map())
  const loadedKey = useRef('')
  const dirtyDevices = useRef(false)

  const devices = useQuery({
    queryKey: [...tenantSiteKeys.devices(cid, site.id), 'map'],
    queryFn: () =>
      fetchAllPages((page, pageSize) => tenantSiteApi(cid).devices(site.id, { page, pageSize, sort: 'name' })),
    enabled: mode === 'device',
  })

  const deviceKey =
    devices.data?.map((device) => `${device.id}:${device.longitude ?? ''},${device.latitude ?? ''}`).join('|') ?? ''
  // 设备列表到达或刷新时，把服务端坐标记成比较基准。有未保存拖动时不覆盖。
  if (devices.data && !dirtyDevices.current && deviceKey !== loadedKey.current) {
    originals.current = new Map(devices.data.map((device) => [device.id, lngLatOf(device)]))
    loadedKey.current = deviceKey
  }

  const draft = useMemo(() => {
    const next = new Map<number, LngLat | null>()
    for (const device of devices.data ?? []) {
      next.set(device.id, positions.has(device.id) ? (positions.get(device.id) ?? null) : lngLatOf(device))
    }
    return next
  }, [devices.data, positions])
  const moved = changedPositions(originals.current, draft)
  const movedIds = useMemo(() => new Set(moved.map((item) => item.id)), [moved])
  const fenceDirty = geofenceSignature(areas) !== baseline
  const dirty = fenceDirty || moved.length > 0
  const saveRef = useRef<() => void>(() => {})

  useEffect(() => {
    onChrome?.({
      savedCount,
      dirty,
      saving,
      canSave: mode === 'fence' ? fenceDirty : moved.length > 0,
      saveLabel: mode === 'fence' ? '保存围栏' : moved.length ? `保存位置 (${moved.length})` : '保存位置',
      save: () => saveRef.current(),
    })
  }, [onChrome, savedCount, dirty, saving, mode, fenceDirty, moved.length])
  useEffect(() => () => onChrome?.(null), [onChrome])

  // 页签切换只改 ?tab，由详情页单独确认。这里只拦真正离开本页的跳转。
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && !saving && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    notify.modal()?.confirm({
      title: '放弃未保存的修改？',
      okText: '放弃并离开',
      okButtonProps: { danger: true },
      cancelText: '继续编辑',
      onOk: () => blocker.proceed(),
      onCancel: () => blocker.reset(),
    })
  }, [blocker])
  useEffect(() => {
    if (!dirty) return
    const onLeave = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [dirty])

  const saveFence = async () => {
    const saved = normalizeAreas(areas)
    setSaving(true)
    try {
      const properties = withGeofences(site.properties, saved)
      await tenantSiteApi(cid).update(site.id, { properties })
      qc.setQueryData(tenantSiteKeys.detail(cid, site.id), (current: SiteDetail | undefined) =>
        current ? { ...current, properties } : current,
      )
      setAreas(saved)
      setBaseline(geofenceSignature(saved))
      setSavedCount(saved.length)
      notify.success(saved.length ? '围栏已保存' : '围栏已清空')
      invalidateTenant(qc, cid, 'sites')
    } catch (error) {
      handleGlobalError(error)
    } finally {
      setSaving(false)
    }
  }

  const moveDevice = (id: number, lng: number, lat: number) => {
    setPlacingId(null)
    setPositions((prev) => {
      const next = new Map(prev)
      for (const device of devices.data ?? []) {
        if (!next.has(device.id)) next.set(device.id, lngLatOf(device))
      }
      next.set(id, [lng, lat])
      dirtyDevices.current = changedPositions(originals.current, next).length > 0
      return next
    })
  }

  const saveDevices = async () => {
    if (!moved.length) return
    setSaving(true)
    const items = moved
    const failures: { error: unknown }[] = []
    const failedIds = new Set<number>()
    let cursor = 0
    const worker = async () => {
      const api = tenantDeviceConfigApi(cid)
      for (;;) {
        const item = items[cursor++]
        if (!item) return
        try {
          await api.updateBasic(item.id, { longitude: item.longitude, latitude: item.latitude })
        } catch (error) {
          failedIds.add(item.id)
          failures.push({ error })
        }
      }
    }
    try {
      await Promise.all(Array.from({ length: Math.min(4, items.length) }, () => worker()))
      const next = new Map(originals.current)
      for (const item of items) {
        if (!failedIds.has(item.id)) next.set(item.id, [item.longitude, item.latitude])
      }
      originals.current = next
      dirtyDevices.current = failedIds.size > 0
      setPositions((prev) => new Map(prev))
      if (!failures.length)
        notify.success(items.length === 1 ? '设备位置已保存' : `已保存 ${items.length} 台设备的位置`)
      else {
        handleGlobalError(failures[0]?.error)
        if (failedIds.size < items.length) {
          notify.warning(`${items.length - failedIds.size} 台已保存，${failedIds.size} 台仍未保存`)
        }
      }
      if (failedIds.size < items.length) invalidateTenant(qc, cid, 'sites', 'devices')
    } finally {
      setSaving(false)
    }
  }

  saveRef.current = () => {
    if (mode === 'fence') void saveFence()
    else void saveDevices()
  }

  const located = site.longitude != null && site.latitude != null
  const unlocated = (devices.data ?? []).filter((device) => draft.get(device.id) == null)
  const placed = (devices.data ?? []).filter((device) => draft.get(device.id) != null)

  return (
    <div className="layout-fill grid h-full min-h-0 grid-cols-[300px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-3">
      <aside className="flex h-full min-h-0 flex-col gap-3 overflow-hidden rounded-lg border border-line bg-container p-3">
        <Segmented
          block
          value={mode}
          onChange={(value) => {
            setMode(value as Mode)
            setPlacingId(null)
          }}
          options={[
            { label: '编辑围栏', value: 'fence', icon: <HighlightOutlined /> },
            {
              label: '调整设备',
              value: 'device',
              icon: <AimOutlined />,
              disabled: savedCount === 0,
              tooltip: savedCount === 0 ? '先保存围栏' : undefined,
            },
          ]}
        />
        {mode === 'fence' ? (
          <>
            <Segmented
              block
              size="small"
              value={tool}
              onChange={(value) => setTool(value as Tool)}
              options={[
                { label: '矩形', value: 'rectangle', icon: <BorderOutlined /> },
                { label: '多边形', value: 'polygon', icon: <NodeIndexOutlined /> },
                { label: '调整', value: 'select', icon: <DragOutlined /> },
              ]}
            />
            <p className="m-0 text-fg-tertiary text-xs">
              矩形按住拖出。多边形单击落点，再点起点闭合。调整时可拖顶点，边上的点可插入。
            </p>
          </>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {mode === 'fence' ? (
            <FenceList
              areas={areas}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id)
                setTool('select')
                fenceRef.current?.select(id)
              }}
              onRename={(id, name) =>
                setAreas((prev) => prev.map((area) => (area.id === id ? { ...area, name } : area)))
              }
              onRemove={(id) => {
                fenceRef.current?.remove(id)
                setAreas((prev) => prev.filter((area) => area.id !== id))
                setSelectedId((current) => (current === id ? null : current))
              }}
            />
          ) : (
            <DeviceList
              loading={devices.isLoading}
              error={devices.error}
              unlocated={unlocated}
              placed={placed}
              movedIds={movedIds}
              placingId={placingId}
              fenceDirty={fenceDirty}
              onPlace={setPlacingId}
            />
          )}
        </div>
      </aside>
      <div className="h-full min-h-0">
        <TdtMap
          height="100%"
          className={`h-full ${placingId != null ? 'cursor-crosshair' : ''}`}
          center={located ? [site.latitude ?? 0, site.longitude ?? 0] : CHINA_CENTER}
          zoom={located ? 16 : 4}
        >
          {mode === 'fence' ? (
            <FenceMap
              ref={fenceRef}
              areas={areas}
              tool={tool}
              onAreas={setAreas}
              onSelect={(id) => {
                setSelectedId(id)
                if (id) setTool('select')
              }}
            />
          ) : (
            <DeviceLayer
              areas={areas}
              devices={devices.data ?? []}
              draft={draft}
              placingId={placingId}
              movedIds={movedIds}
              onMove={moveDevice}
              onPlace={(lng, lat) => {
                if (placingId != null) moveDevice(placingId, lng, lat)
              }}
              ready={devices.isSuccess}
            />
          )}
        </TdtMap>
      </div>
    </div>
  )
}

function FenceList({
  areas,
  selectedId,
  onSelect,
  onRename,
  onRemove,
}: {
  areas: GeofenceArea[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="space-y-2">
      {areas.length ? (
        <ul className="m-0 list-none space-y-2 p-0">
          {areas.map((area) => (
            <li
              key={area.id}
              className={`rounded-md border p-2 ${area.id === selectedId ? 'border-primary bg-primary-bg' : 'border-line'}`}
            >
              <div className="flex items-center gap-1">
                <Input
                  size="small"
                  value={area.name}
                  maxLength={40}
                  aria-label="区域名称"
                  onFocus={() => onSelect(area.id)}
                  onChange={(event) => onRename(area.id, event.target.value)}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  aria-label={`删除${area.name}`}
                  icon={<DeleteOutlined />}
                  onClick={() => onRemove(area.id)}
                />
              </div>
              <div className="mt-1 text-fg-tertiary text-xs">{area.ring.length} 个顶点</div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有区域" />
      )}
    </div>
  )
}

function DeviceList({
  loading,
  error,
  unlocated,
  placed,
  movedIds,
  placingId,
  fenceDirty,
  onPlace,
}: {
  loading: boolean
  error: unknown
  unlocated: SiteDevice[]
  placed: SiteDevice[]
  movedIds: Set<number>
  placingId: number | null
  fenceDirty: boolean
  onPlace: (id: number | null) => void
}) {
  if (loading) return <Spin className="block py-8" />
  if (error) {
    return <Alert type="error" showIcon title={error instanceof Error ? error.message : '园区设备加载失败'} />
  }
  return (
    <div className="space-y-3">
      <Alert
        type="info"
        showIcon
        title="经纬度写在设备上。一台设备挂到多个园区时，这里的调整会同时改变它在其他园区的位置。"
      />
      {fenceDirty ? <p className="m-0 text-fg-tertiary text-xs">围栏还有未保存的修改，地图上是当前草稿。</p> : null}
      {placingId != null ? <p className="m-0 text-primary text-xs">在地图上点击，放下这台设备。</p> : null}
      <DeviceGroup
        icon={<EnvironmentOutlined />}
        title={`未定位 (${unlocated.length})`}
        devices={unlocated}
        placingId={placingId}
        onPlace={onPlace}
      />
      <DeviceGroup
        icon={<AimOutlined />}
        title={`已在地图上 (${placed.length})`}
        devices={placed}
        movedIds={movedIds}
        placingId={placingId}
        onPlace={onPlace}
      />
    </div>
  )
}

function DeviceGroup({
  icon,
  title,
  devices,
  movedIds,
  placingId,
  onPlace,
}: {
  icon: ReactNode
  title: string
  devices: SiteDevice[]
  movedIds?: Set<number>
  placingId: number | null
  onPlace: (id: number | null) => void
}) {
  return (
    <section>
      <div className="mb-1 flex items-center gap-1.5 font-medium text-sm">
        {icon}
        {title}
      </div>
      {devices.length ? (
        <ul className="m-0 list-none space-y-1 p-0">
          {devices.map((device) => (
            <li key={device.id} className="flex items-center gap-2 py-1">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{device.name}</div>
                <div className="truncate font-mono text-fg-tertiary text-xs">{device.deviceSn}</div>
              </div>
              {movedIds?.has(device.id) ? <span className="text-primary text-xs">未保存</span> : null}
              {placingId == null ? (
                <Button
                  type="link"
                  size="small"
                  className="px-0"
                  icon={movedIds ? <AimOutlined /> : <EnvironmentOutlined />}
                  onClick={() => onPlace(device.id)}
                >
                  {movedIds ? '重新落点' : '放到地图'}
                </Button>
              ) : placingId === device.id ? (
                <Button
                  type="link"
                  size="small"
                  className="px-0"
                  icon={<CloseOutlined />}
                  onClick={() => onPlace(null)}
                >
                  取消
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-fg-tertiary text-xs">无</div>
      )}
    </section>
  )
}

function DeviceLayer({
  areas,
  devices,
  draft,
  placingId,
  movedIds,
  onMove,
  onPlace,
  ready,
}: {
  areas: GeofenceArea[]
  devices: SiteDevice[]
  draft: Map<number, LngLat | null>
  placingId: number | null
  movedIds: Set<number>
  onMove: (id: number, lng: number, lat: number) => void
  onPlace: (lng: number, lat: number) => void
  ready: boolean
}) {
  const types = useDeviceTypes()
  const points = [
    ...areas.flatMap((area) => area.ring.map(([lng, lat]) => [lat, lng] as [number, number])),
    ...devices.flatMap((device) => {
      const at = draft.get(device.id)
      return at ? [[at[1], at[0]] as [number, number]] : []
    }),
  ]
  return (
    <>
      {areas.map((area) => (
        <Polygon
          key={area.id}
          interactive={false}
          positions={area.ring.map(([lng, lat]) => [lat, lng])}
          pathOptions={{ color: '#0891b2', weight: 2, fillColor: '#06b6d4', fillOpacity: 0.16 }}
        >
          <Tooltip>{area.name}</Tooltip>
        </Polygon>
      ))}
      {devices.map((device) => {
        const at = draft.get(device.id)
        if (at == null) return null
        const type = device.deviceTypeId == null ? undefined : types.byId.get(device.deviceTypeId)
        const kind = deviceGlyphKind(type?.name)
        const selected = placingId === device.id
        return (
          <Marker
            key={device.id}
            position={[at[1], at[0]]}
            draggable
            zIndexOffset={selected || movedIds.has(device.id) ? 1000 : 0}
            icon={deviceMarkerIcon({
              name: device.name,
              online: device.online,
              alarms: 0,
              kind,
              iconUrl: type?.iconUrl || undefined,
              selected,
              theme: 'light',
            })}
            title={deviceMarkerTitle({ name: device.name, online: device.online, alarms: 0, kind })}
            eventHandlers={{
              dragend: (event) => {
                const latLng = (event.target as LeafletMarker).getLatLng()
                onMove(device.id, latLng.lng, latLng.lat)
              },
            }}
          />
        )
      })}
      <PlaceClick active={placingId != null} onPlace={onPlace} />
      <FitOnce points={points} ready={ready} />
    </>
  )
}

function PlaceClick({ active, onPlace }: { active: boolean; onPlace: (lng: number, lat: number) => void }) {
  useMapEvents({
    click: (event) => {
      if (!active) return
      const target = event.originalEvent.target
      if (target instanceof Element && target.closest('.leaflet-marker-icon')) return
      onPlace(event.latlng.lng, event.latlng.lat)
    },
  })
  return null
}

/** 设备加载完再框一次视野，拖动设备时不再打断 */
function FitOnce({ points, ready }: { points: [number, number][]; ready: boolean }) {
  const map = useMap()
  const done = useRef(false)
  const latest = useRef(points)
  latest.current = points
  useEffect(() => {
    if (!ready || done.current) return
    done.current = true
    fitGeofence(map, latest.current)
  }, [map, ready])
  return null
}
