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
import { isVideoDeviceType, type Realtime } from '@/features/telemetry/lib/realtime'
import { realtimeQuery } from '@/features/telemetry/realtime/api'
import { useCompanyId, useCurrentCompany } from '@/hooks/session'
import { CameraCard } from './CameraCard'
import { DeviceInfoCard, OperationsCard, RealtimeCard, RelayCard, TrendCard, useRelayUnlock } from './DeviceCards'
import { computeLayout, fitScreen, HEADER_H, type ScreenLayout } from './layout'
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
 * - 地图铺满视口；面板按 1920 × 1080 设计稿等比缩放后叠在地图上，画布随屏幕比例伸缩，卡片贴住左、右、下边
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
  const stageRef = useRef<HTMLDivElement>(null)
  const [layer, setLayer] = useState<TdtLayerName>('img')
  const [cameraId, setCameraId] = useState<number | null>(null)
  // 地图气泡：默认不显示，点击地图上的设备后显示
  const [bubbleId, setBubbleId] = useState<number | null>(null)
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

  const plan = computeLayout(vp.width, vp.height, {
    sensors: hasSensors,
    relays: hasRelays,
    cameras: cameras.length > 0,
  })

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
    paddingTopLeft: [(plan.mapSafe.left + 24) * s, (plan.mapSafe.top + 70) * s],
    paddingBottomRight: [
      (plan.width - plan.mapSafe.right + 24) * s,
      plan.bottomTop != null ? (plan.height - plan.bottomTop + 32) * s : 90 * s,
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
  const ctlTop = plan.bottomTop != null ? plan.bottomTop - 50 : plan.height - 20 - 40

  return (
    <div className="screen-root">
      {site && (
        <div className="screen-map">
          <ScreenMap
            mapRef={mapRef}
            layer={layer}
            site={site}
            points={points}
            selectedId={device?.id ?? null}
            isCamera={(id) => cameras.some((c) => c.id === id)}
            onPick={(id) => {
              select({ deviceId: id })
              setBubbleId(id)
            }}
            onPickCamera={(id) => {
              setCameraId(id)
              setBubbleId(id)
            }}
            padding={padding}
            bubbleId={bubbleId}
            onBubbleClose={() => setBubbleId(null)}
            renderBubble={(p) => <Bubble point={p} />}
          />
        </div>
      )}
      <div className="screen-header-bg" style={{ height: HEADER_H * s }} />
      <div
        ref={stageRef}
        className="screen-stage"
        style={{ width: plan.width, height: plan.height, transform: `scale(${s})` }}
      >
        {/* 下拉、提示等弹层挂在画布里，与卡片一起缩放 */}
        <ConfigProvider getPopupContainer={() => stageRef.current ?? document.body}>
          <ScreenHeader
            companyName={company?.name ?? ''}
            sites={sites}
            siteId={site?.id ?? null}
            onSiteChange={(id) => {
              setBubbleId(null)
              select({ siteId: id })
            }}
            title={title}
            backTo={backTo}
            width={plan.width}
          />
          {sitesQ.isPending ? (
            <Center plan={plan}>
              <Spin size="large" />
              <span>正在加载大屏数据…</span>
            </Center>
          ) : !site ? (
            <Center plan={plan}>
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
              onDevice={(id) => {
                setBubbleId(null)
                select({ deviceId: id })
              }}
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
                items={['online', 'offline', 'alarm', 'selected', 'cluster']}
                className="absolute"
                style={{ left: plan.mapSafe.left + 12, top: ctlTop, padding: '8px 14px' }}
              />
              <div
                className="absolute flex gap-1.5"
                style={{ left: plan.mapSafe.right - 12, top: ctlTop, transform: 'translateX(-100%)' }}
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
        </ConfigProvider>
      </div>
    </div>
  )
}

function Center({ plan, children }: { plan: ScreenLayout; children: React.ReactNode }) {
  return (
    <div
      className="absolute flex flex-col items-center justify-center gap-3 text-[14px] text-[var(--sc-text-2)]"
      style={{ left: 0, top: HEADER_H, width: plan.width, height: plan.height - HEADER_H }}
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
  plan: ScreenLayout
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
      <WeatherSiteCard site={site} devices={devices.length} cameras={cameras.length} rect={plan.fixed.weather} />
      <DeviceTypeCard devices={devices} typeName={typeName} rect={plan.fixed.deviceTypes} />
      <AlarmCard siteId={site.id} total={siteAlarms} alarms={alarms} onPick={onAlarmPick} rect={plan.fixed.alarms} />
      <KpiBar total={devices.length} online={online} alarms={siteAlarms} left={plan.width / 2} top={HEADER_H + 16} />
      <DeviceInfoCard
        rect={plan.fixed.deviceInfo}
        device={device}
        candidates={candidates}
        onChange={onDevice}
        typeName={device ? typeName(device) : ''}
        typeIcon={device ? typeIcon(device) : undefined}
        siteName={site.name}
        realtime={realtime}
        alarms={device ? (alarmsOf.get(device.id) ?? 0) : 0}
      />
      {plan.right.map(({ card, rect }) =>
        card === 'camera' ? (
          <CameraCard key="camera" cameras={cameras} cameraId={cameraId} onChange={onCamera} rect={rect} />
        ) : !device ? null : card === 'realtime' ? (
          <RealtimeCard
            key={`rt-${device.id}`}
            device={device}
            realtime={realtime}
            failed={realtimeFailed}
            rect={rect}
          />
        ) : (
          <OperationsCard key={`ops-${device.id}`} device={device} rect={rect} />
        ),
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

/** 地图气泡 (点击设备后显示)：名称、是否在线、未处理告警数 */
function Bubble({ point }: { point: ScreenMapPoint }) {
  return (
    <div className="min-w-[160px] max-w-[260px]">
      <div className="truncate font-bold text-[14px]" title={point.name}>
        {point.name}
      </div>
      <div className="mt-1.5 flex items-center gap-3 whitespace-nowrap text-[13px]">
        <span className={point.online ? 'text-[#67e8f9]' : 'text-[#cbd5e1]'}>{point.online ? '● 在线' : '○ 离线'}</span>
        {point.alarms > 0 ? (
          <span className="text-[#fca5a5]">⚠ {point.alarms} 条告警</span>
        ) : (
          <span className="text-[var(--sc-text-3)]">无告警</span>
        )}
      </div>
    </div>
  )
}
