import { AimOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { App, ConfigProvider, Spin } from 'antd'
import type { Map as LeafletMap } from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { screenTheme } from '@/app/theme'
import { MapLegend } from '@/components/map/MapLegend'
import type { TdtLayerName } from '@/components/map/TdtMap'
import { alarmsQuery, scopedUnprocessedCountQuery } from '@/features/alarm/api'
import { type AppDevice, appSiteDevicesQuery } from '@/features/device/api'
import { useDeviceTypes } from '@/features/dict/api'
import { appSitesQuery, type SiteView } from '@/features/site/api'
import { byChannel, channelName, isVideoDeviceType, type Realtime, readSensor } from '@/features/telemetry/lib/realtime'
import { realtimeQuery } from '@/features/telemetry/realtime/api'
import { useCompanyId, useCurrentCompany } from '@/hooks/session'
import { CameraCard } from './CameraCard'
import { DeviceInfoCard, OperationsCard, RealtimeCard, RelayCard, TrendCard, useRelayUnlock } from './DeviceCards'
import { DESIGN_H, DESIGN_W, fitScreen, HEADER_H, MAP_SAFE, planScreen } from './layout'
import { ScreenHeader } from './ScreenHeader'
import { type FitPadding, fitSite, ScreenMap, type ScreenMapPoint } from './ScreenMap'
import { AlarmCard, DeviceTypeCard, KpiBar, WeatherSiteCard } from './SiteCards'
import './screen.css'

/** 长时间运行释放内存：每 6 小时刷新页面 (FRONTEND_DESIGN §5.7) */
const RELOAD_MS = 6 * 3600_000

function useViewport() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return { ...size, ...fitScreen(size.w, size.h) }
}

/**
 * 数据大屏 (FRONTEND_DESIGN §5.7) `/screen/:companyId?siteId&deviceId`
 * - 地图铺满视口；面板按 1920 × 1080 设计稿等比缩放后叠在地图上
 * - 左栏 (园区) 与「设备信息」固定；其余卡片按当前设备的通道配置与园区有无摄像头编排 (layout.ts)
 */
export default function ScreenPage() {
  return (
    <ConfigProvider theme={screenTheme}>
      <App className="h-full">
        <ScreenBody />
      </App>
    </ConfigProvider>
  )
}

function ScreenBody() {
  const companyId = useCompanyId()
  const company = useCurrentCompany()
  const [params, setParams] = useSearchParams()
  const vp = useViewport()
  const mapRef = useRef<LeafletMap | null>(null)
  const [layer, setLayer] = useState<TdtLayerName>('img')
  const [cameraId, setCameraId] = useState<number | null>(null)
  const unlock = useRelayUnlock()

  useEffect(() => {
    const t = window.setTimeout(() => window.location.reload(), RELOAD_MS)
    return () => clearTimeout(t)
  }, [])

  // 园区：URL 指定的 › 第一个运营中的 › 第一个
  const sitesQ = useQuery(appSitesQuery(companyId))
  const sites = sitesQ.data ?? []
  const site =
    sites.find((s) => s.id === Number(params.get('siteId'))) ?? sites.find((s) => s.status === 'active') ?? sites[0]
  const siteId = site?.id ?? 0

  const types = useDeviceTypes()
  const typeName = (d: AppDevice) => types.nameOf(d.deviceTypeId)
  const typeIcon = (d: AppDevice) =>
    d.deviceTypeId != null ? types.byId.get(d.deviceTypeId)?.icon || undefined : undefined
  const isCamera = (d: AppDevice) => isVideoDeviceType(typeName(d))

  const devicesQ = useQuery({ ...appSiteDevicesQuery(companyId, siteId), enabled: Boolean(site) })
  const devices = devicesQ.data ?? []
  const cameras = devices.filter(isCamera)
  const candidates = devices.filter((d) => !isCamera(d))
  // 当前设备：URL 指定的 › 第一个 (摄像头不参与切换，在「实时监控」里看)
  const device = candidates.find((d) => d.id === Number(params.get('deviceId'))) ?? candidates[0]

  const alarmsQ = useQuery({
    ...alarmsQuery(companyId, { siteId, processed: 'false', sort: '-lastAlarmAt', page: 1, pageSize: 200 }),
    enabled: Boolean(site),
    refetchInterval: 30_000,
    meta: { silent: true },
  })
  const alarmsOf = new Map<number, number>()
  for (const a of alarmsQ.data?.records ?? []) alarmsOf.set(a.deviceId, (alarmsOf.get(a.deviceId) ?? 0) + 1)
  const siteAlarms = useQuery({
    ...scopedUnprocessedCountQuery(companyId, { siteId }),
    enabled: Boolean(site),
    refetchInterval: 30_000,
  }).data

  const hasSensors = Boolean(device?.sensors?.length)
  const hasRelays = Boolean(device?.relays?.length)
  const rtQ = useQuery({
    ...realtimeQuery(companyId, device?.id ?? 0),
    enabled: Boolean(device) && (hasSensors || hasRelays),
    refetchInterval: 10_000,
  })
  const realtime = rtQ.data

  const plan = planScreen({ sensors: hasSensors, relays: hasRelays, cameras: cameras.length > 0 })

  const select = (next: { siteId?: number; deviceId?: number }) =>
    setParams(
      () => {
        const p = new URLSearchParams()
        const sid = next.siteId ?? siteId
        if (sid) p.set('siteId', String(sid))
        if (next.deviceId) p.set('deviceId', String(next.deviceId))
        return p
      },
      { replace: true },
    )

  const title = site ? `${site.name}智慧农业监测平台` : '智慧农业监测平台'
  useEffect(() => {
    document.title = `${title} · 数据大屏`
  }, [title])

  // 地图视野避开面板 (视口像素)
  const s = vp.scale
  const padding: FitPadding = {
    paddingTopLeft: [vp.offsetX + MAP_SAFE.left * s + 24, (MAP_SAFE.top + 70) * s],
    paddingBottomRight: [
      vp.w - (vp.offsetX + MAP_SAFE.right * s) + 24,
      plan.bottomTop != null ? vp.h - plan.bottomTop * s + 32 : 90 * s,
    ],
  }
  const points: ScreenMapPoint[] = devices.flatMap((d) =>
    d.longitude != null && d.latitude != null
      ? [
          {
            ...d,
            longitude: d.longitude,
            latitude: d.latitude,
            alarms: alarmsOf.get(d.id) ?? 0,
            typeName: typeName(d),
            iconUrl: typeIcon(d),
          },
        ]
      : [],
  )
  const online = devices.filter((d) => d.online).length
  const backTo = `/app/${companyId}/monitor${site ? `?siteId=${site.id}${device ? `&deviceId=${device.id}` : ''}` : ''}`
  const recordsLink = `/app/${companyId}/operations${site ? `?siteId=${site.id}${device ? `&deviceId=${device.id}` : ''}` : ''}`
  const ctlTop = plan.bottomTop != null ? plan.bottomTop - 50 : DESIGN_H - 20 - 40

  return (
    <div className="screen-root">
      {site && (
        <div className="screen-map">
          <ScreenMap
            mapRef={mapRef}
            layer={layer}
            site={site}
            points={points}
            total={devices.length}
            online={online}
            alarms={siteAlarms?.count ?? 0}
            selectedId={device?.id ?? null}
            isCamera={(id) => cameras.some((c) => c.id === id)}
            onPick={(id) => select({ deviceId: id })}
            onPickCamera={setCameraId}
            padding={padding}
            bubble={device && <Bubble device={device} realtime={realtime} alarms={alarmsOf.get(device.id) ?? 0} />}
          />
        </div>
      )}
      <div className="screen-header-bg" style={{ height: HEADER_H * s }} />
      <div
        className="screen-stage"
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `translate(${vp.offsetX}px, ${vp.offsetY}px) scale(${s})`,
        }}
      >
        <ScreenHeader
          companyName={company?.name ?? ''}
          sites={sites}
          siteId={site?.id ?? null}
          onSiteChange={(id) => select({ siteId: id })}
          title={title}
          backTo={backTo}
        />
        {sitesQ.isPending ? (
          <Center>
            <Spin size="large" />
            <span>正在加载大屏数据…</span>
          </Center>
        ) : !site ? (
          <Center>
            <span className="text-[18px] text-white">该企业还没有园区</span>
            <Link to={`/app/${companyId}/monitor`}>返回数据端</Link>
          </Center>
        ) : (
          <SiteStage
            key={site.id}
            site={site}
            devices={devices}
            cameras={cameras}
            candidates={candidates}
            device={device}
            realtime={realtime}
            realtimeFailed={rtQ.isError}
            plan={plan}
            alarms={alarmsQ.data?.records}
            alarmsOf={alarmsOf}
            siteAlarms={siteAlarms}
            online={online}
            typeName={typeName}
            typeIcon={typeIcon}
            cameraId={cameraId}
            onCamera={setCameraId}
            onDevice={(id) => select({ deviceId: id })}
            onAlarmPick={(id) => {
              if (candidates.some((d) => d.id === id)) select({ deviceId: id })
              else if (cameras.some((c) => c.id === id)) setCameraId(id)
            }}
            unlock={unlock}
            recordsLink={recordsLink}
          />
        )}
        {site && (
          <>
            <MapLegend
              theme="dark"
              items={['online', 'offline', 'alarm', 'selected', 'cluster', 'site']}
              className="absolute"
              style={{ left: MAP_SAFE.left + 12, top: ctlTop, padding: '8px 14px' }}
            />
            <div
              className="absolute flex gap-1.5"
              style={{ left: MAP_SAFE.right - 12, top: ctlTop, transform: 'translateX(-100%)' }}
            >
              {(['img', 'vec'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`screen-btn ${layer === l ? 'is-active' : 'is-quiet'}`}
                  style={{ height: 32, fontSize: 12, background: layer === l ? undefined : 'var(--sc-panel)' }}
                  onClick={() => setLayer(l)}
                  aria-pressed={layer === l}
                >
                  {l === 'img' ? '影像' : '矢量'}
                </button>
              ))}
              <button
                type="button"
                className="screen-btn is-quiet"
                style={{ width: 32, height: 32, padding: 0, background: 'var(--sc-panel)' }}
                aria-label="放大"
                onClick={() => mapRef.current?.zoomIn()}
              >
                <PlusOutlined />
              </button>
              <button
                type="button"
                className="screen-btn is-quiet"
                style={{ width: 32, height: 32, padding: 0, background: 'var(--sc-panel)' }}
                aria-label="缩小"
                onClick={() => mapRef.current?.zoomOut()}
              >
                <MinusOutlined />
              </button>
              <button
                type="button"
                className="screen-btn is-quiet"
                style={{ width: 32, height: 32, padding: 0, background: 'var(--sc-panel)' }}
                aria-label="复位视野"
                title="复位视野"
                onClick={() => mapRef.current && fitSite(mapRef.current, site, points, padding)}
              >
                <AimOutlined />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="absolute flex flex-col items-center justify-center gap-3 text-[14px] text-[var(--sc-text-2)]"
      style={{ left: 0, top: HEADER_H, width: DESIGN_W, height: DESIGN_H - HEADER_H }}
    >
      {children}
    </div>
  )
}

/** 一个园区下的全部卡片 (切换园区时整体重建，淡入) */
function SiteStage({
  site,
  devices,
  cameras,
  candidates,
  device,
  realtime,
  realtimeFailed,
  plan,
  alarms,
  alarmsOf,
  siteAlarms,
  online,
  typeName,
  typeIcon,
  cameraId,
  onCamera,
  onDevice,
  onAlarmPick,
  unlock,
  recordsLink,
}: {
  site: SiteView
  devices: AppDevice[]
  cameras: AppDevice[]
  candidates: AppDevice[]
  device: AppDevice | undefined
  realtime: Realtime | undefined
  realtimeFailed: boolean
  plan: ReturnType<typeof planScreen>
  alarms: Parameters<typeof AlarmCard>[0]['alarms']
  alarmsOf: Map<number, number>
  siteAlarms: { count: number; capped: boolean } | undefined
  online: number
  typeName: (d: AppDevice) => string
  typeIcon: (d: AppDevice) => string | undefined
  cameraId: number | null
  onCamera: (id: number) => void
  onDevice: (id: number) => void
  onAlarmPick: (deviceId: number) => void
  unlock: ReturnType<typeof useRelayUnlock>
  recordsLink: string
}) {
  return (
    <>
      <WeatherSiteCard site={site} devices={devices.length} cameras={cameras.length} />
      <DeviceTypeCard devices={devices} typeName={typeName} />
      <AlarmCard siteId={site.id} total={siteAlarms} alarms={alarms} onPick={onAlarmPick} />
      <KpiBar total={devices.length} online={online} alarms={siteAlarms} left={DESIGN_W / 2} top={HEADER_H + 16} />
      <DeviceInfoCard
        device={device}
        candidates={candidates}
        onChange={onDevice}
        typeName={device ? typeName(device) : ''}
        typeIcon={device ? typeIcon(device) : undefined}
        siteName={site.name}
        realtime={realtime}
        alarms={device ? (alarmsOf.get(device.id) ?? 0) : 0}
      />
      {device &&
        plan.right.map(({ card, rect }) =>
          card === 'realtime' ? (
            <RealtimeCard
              key={`rt-${device.id}`}
              device={device}
              realtime={realtime}
              failed={realtimeFailed}
              rect={rect}
            />
          ) : card === 'camera' ? (
            <CameraCard key="camera" cameras={cameras} cameraId={cameraId} onChange={onCamera} rect={rect} />
          ) : (
            <OperationsCard key={`ops-${device.id}`} device={device} rect={rect} />
          ),
        )}
      {!device && cameras.length > 0 && (
        <CameraCard
          cameras={cameras}
          cameraId={cameraId}
          onChange={onCamera}
          rect={planScreen({ sensors: false, relays: false, cameras: true }).right[0].rect}
        />
      )}
      {device &&
        plan.bottom.map(({ card, rect }) =>
          card === 'trend' ? (
            <TrendCard key={`trend-${device.id}`} device={device} rect={rect} />
          ) : (
            <RelayCard
              key={`relay-${device.id}`}
              device={device}
              realtime={realtime}
              rect={rect}
              unlock={unlock}
              recordsLink={plan.omitted.includes('operations') ? recordsLink : undefined}
            />
          ),
        )}
    </>
  )
}

/** 地图上选中设备的气泡：传感器前 4 个当前值 / 继电器运行情况 / 未配置提示 */
function Bubble({ device, realtime, alarms }: { device: AppDevice; realtime: Realtime | undefined; alarms: number }) {
  const online = realtime?.online ?? device.online
  const sensors = byChannel(device.sensors).slice(0, 4)
  const relays = byChannel(device.relays)
  const onCount = relays.filter((r) => realtime?.relays?.[r.channelNum] === 1).length
  return (
    <div className="w-[244px]">
      <div className="mb-2 flex items-center gap-2">
        <span className="truncate font-bold text-[14px]">{device.name}</span>
        <span className={online ? 'text-[#67e8f9]' : 'text-[#cbd5e1]'}>{online ? '● 在线' : '○ 离线'}</span>
        {alarms > 0 && <span className="ml-auto whitespace-nowrap text-[#fca5a5]">⚠ {alarms} 条告警</span>}
      </div>
      {sensors.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {sensors.map((c) => {
            const r = readSensor(c, realtime?.sensors)
            return (
              <div key={c.channelNum} className="truncate text-[var(--sc-text-2)]">
                {r.name}{' '}
                <span className="screen-num font-semibold text-[17px] text-white">{realtime ? r.text : '…'}</span>
                {r.value != null && c.unit ? ` ${c.unit}` : ''}
              </div>
            )
          })}
        </div>
      ) : relays.length > 0 ? (
        <div className="text-[var(--sc-text-2)]">
          继电器 {relays.length} 路 · 运行{' '}
          <span className="screen-num text-[16px] text-[#67e8f9]">{realtime ? onCount : '…'}</span> 路
          <div className="mt-1 grid grid-cols-2 gap-x-3">
            {relays.slice(0, 4).map((r) => (
              <span key={r.channelNum} className="truncate text-[#cbd5e1]">
                {channelName(r)}{' '}
                <span className={realtime?.relays?.[r.channelNum] === 1 ? 'text-[#67e8f9]' : 'text-[var(--sc-text-3)]'}>
                  {realtime?.relays?.[r.channelNum] === 1 ? '运行' : '停止'}
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-[#fcd34d]">未配置传感器和继电器通道</div>
      )}
    </div>
  )
}
