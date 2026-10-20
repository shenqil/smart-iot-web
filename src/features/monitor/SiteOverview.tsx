import { AppstoreOutlined, CloudOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Card, Empty, Skeleton } from 'antd'
import { Link } from 'react-router'
import { DeviceMap } from '@/components/map/DeviceMap'
import { DEVICE_STATUS, EnumTag, SITE_STATUS } from '@/components/StatusTag'
import { alarmsQuery, scopedUnprocessedCountQuery } from '@/features/alarm/api'
import { AlarmLevelTag } from '@/features/alarm/enums'
import { type AppDevice, appSiteDevicesQuery } from '@/features/device/api'
import { useDeviceTypes } from '@/features/dict/api'
import { appSitesQuery, weatherQuery } from '@/features/site/api'
import { agoText, byChannel, isVideoDeviceType, readSensor } from '@/features/telemetry/lib/realtime'
import { realtimeQuery } from '@/features/telemetry/realtime/api'
import { useCompanyId } from '@/hooks/session'
import { useInView } from '@/hooks/useInView'
import { useScope } from '@/layouts/app/useScope'
import { fmtDateTime } from '@/lib/time'

/**
 * 园区总览 (FRONTEND_DESIGN §5.2)
 * 概况 (设备 / 在线 / 离线 / 未处理告警 / 天气) → 地图 + 最新告警 → 设备卡片 (可视区域内加载前 3 个传感器当前值)
 */
export function SiteOverview({ siteId }: { siteId: number }) {
  const companyId = useCompanyId()
  const { select } = useScope()
  const site = useQuery(appSitesQuery(companyId)).data?.find((s) => s.id === siteId)
  const devices = useQuery(appSiteDevicesQuery(companyId, siteId))
  const alarm = useQuery(scopedUnprocessedCountQuery(companyId, { siteId })).data
  // 设备级未处理告警数 (与设备树共用同一个查询)
  const unprocessed = useQuery({
    ...alarmsQuery(companyId, { siteId, processed: 'false', page: 1, pageSize: 200 }),
    meta: { silent: true },
  }).data
  const latest = useQuery(
    alarmsQuery(companyId, { siteId, processed: 'false', sort: '-lastAlarmAt', page: 1, pageSize: 8 }),
  )
  const located = site?.latitude != null && site?.longitude != null
  const weather = useQuery({
    ...weatherQuery(site?.latitude ?? 0, site?.longitude ?? 0),
    enabled: located,
  }).data
  const types = useDeviceTypes()
  const list = devices.data ?? []
  const online = list.filter((d) => d.online).length
  const address = site && [site.province, site.city, site.district, site.address].filter(Boolean).join(' ')
  const alarmsOf = new Map<number, number>()
  for (const a of unprocessed?.records ?? []) alarmsOf.set(a.deviceId, (alarmsOf.get(a.deviceId) ?? 0) + 1)
  const hasMap = list.some((d) => d.latitude != null && d.longitude != null)
  const alarmsLink = { pathname: `/app/${companyId}/alarms`, search: `?siteId=${siteId}` }

  const latestCard = (
    <Card
      variant="borderless"
      title="最新告警"
      extra={
        <Link to={alarmsLink} className="text-sm">
          查看全部
        </Link>
      }
      className="h-full"
    >
      {latest.isPending ? (
        <Skeleton active />
      ) : !latest.data?.records?.length ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有未处理的告警" />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {latest.data.records.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className="flex w-full cursor-pointer items-start gap-2 rounded-md border-0 bg-transparent px-2 py-1.5 text-left hover:bg-layout"
                onClick={() => select({ siteId, deviceId: a.deviceId })}
              >
                <AlarmLevelTag level={a.alarmLevel} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-fg">{a.description || '告警'}</span>
                  <span className="block truncate text-fg-tertiary text-xs">
                    {a.deviceName}
                    {a.alarmCount > 1 && `，${a.alarmCount} 次`}
                  </span>
                </span>
                <span className="shrink-0 text-fg-tertiary text-xs" title={fmtDateTime(a.lastAlarmAt)}>
                  {agoText(a.lastAlarmAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-lg bg-container px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="m-0 truncate font-semibold text-lg">{site?.name ?? `园区 ${siteId}`}</h2>
            {site && <EnumTag value={site.status} defs={SITE_STATUS} />}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-fg-secondary text-sm">
            {address && (
              <span>
                <EnvironmentOutlined className="mr-1" />
                {address}
              </span>
            )}
            {weather && (
              <span title={`${weather.stale ? '天气服务暂不可用，显示的是旧数据；' : ''}发布于 ${weather.updateTime}`}>
                <CloudOutlined className="mr-1" />
                {weather.weather} {weather.temperature}℃，湿度 {weather.humidity}%
                {weather.windDirection && `，${weather.windDirection}风 ${weather.windPower}级`}
              </span>
            )}
          </div>
        </div>
        <Stat label="设备" value={devices.data ? list.length : '…'} />
        <Stat label="在线" value={devices.data ? online : '…'} tone="success" />
        <Stat label="离线" value={devices.data ? list.length - online : '…'} />
        <Link to={alarmsLink} className="no-underline">
          <Stat
            label="未处理告警"
            value={alarm ? (alarm.capped ? '999+' : alarm.count) : '…'}
            tone={alarm?.count ? 'danger' : undefined}
          />
        </Link>
      </div>

      {hasMap && (
        <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card variant="borderless" title="设备分布">
            <DeviceMap
              height={340}
              devices={list.map((d) => ({ ...d, alarms: alarmsOf.get(d.id) ?? 0 }))}
              onSelect={(id) => select({ siteId, deviceId: id })}
            />
          </Card>
          {latestCard}
        </div>
      )}

      <div className={hasMap ? '' : 'grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]'}>
        <Card variant="borderless" title="设备">
          {devices.isPending ? (
            <Skeleton active />
          ) : list.length === 0 ? (
            <Empty description="该园区还没有挂载设备" />
          ) : (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
              {list.map((d) => (
                <DeviceTile
                  key={d.id}
                  device={d}
                  alarms={alarmsOf.get(d.id) ?? 0}
                  typeName={types.nameOf(d.deviceTypeId)}
                  icon={d.deviceTypeId != null ? types.byId.get(d.deviceTypeId)?.icon : undefined}
                  onClick={() => select({ siteId, deviceId: d.id })}
                />
              ))}
            </div>
          )}
        </Card>
        {!hasMap && latestCard}
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'success' | 'danger' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-fg'
  return (
    <div className="text-right">
      <div className={`font-semibold text-2xl tabular-nums leading-tight ${color}`}>{value}</div>
      <div className="text-fg-tertiary text-xs">{label}</div>
    </div>
  )
}

/** 设备卡片：进入可视区域后加载实时数据 (30s 刷新)，显示前 3 个传感器当前值 */
function DeviceTile({
  device: d,
  alarms,
  typeName,
  icon,
  onClick,
}: {
  device: AppDevice
  alarms: number
  typeName: string
  icon?: string
  onClick: () => void
}) {
  const companyId = useCompanyId()
  const video = isVideoDeviceType(typeName)
  const sensors = byChannel(d.sensors).slice(0, 3)
  const { ref, inView } = useInView<HTMLButtonElement>()
  const rt = useQuery({
    ...realtimeQuery(companyId, d.id),
    enabled: inView && !video && sensors.length > 0,
    refetchInterval: 30_000,
  }).data
  const parts = video
    ? []
    : [
        d.sensors?.length ? `${d.sensors.length} 个传感器` : '',
        d.relays?.length ? `${d.relays.length} 路继电器` : '',
      ].filter(Boolean)
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="flex cursor-pointer flex-col gap-2.5 rounded-lg border border-line border-solid bg-container px-3 py-3 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
    >
      <span className="flex w-full items-center gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-md ${d.online ? 'bg-primary-bg text-primary' : 'bg-layout text-fg-tertiary'}`}
        >
          {icon ? (
            <img src={icon} alt="" className={`size-6 object-contain ${d.online ? '' : 'opacity-50 grayscale'}`} />
          ) : (
            <AppstoreOutlined />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span
              className={`inline-block size-2 shrink-0 rounded-full ${d.online ? 'bg-success' : 'border border-fg-tertiary border-solid'}`}
              title={d.online ? '在线' : '离线'}
            />
            <span className="truncate font-medium text-fg">{d.name}</span>
            {d.status !== 'active' && <EnumTag value={d.status} defs={DEVICE_STATUS} />}
          </span>
          <span className="mt-0.5 block truncate text-fg-tertiary text-xs">
            {typeName}
            {parts.length > 0 && `，${parts.join('，')}`}
          </span>
        </span>
        {alarms > 0 && (
          <span className="shrink-0 rounded-full bg-danger/10 px-2 text-danger text-xs leading-5">⚠ {alarms}</span>
        )}
      </span>
      {sensors.length > 0 && !video && (
        <span
          className={`grid w-full grid-cols-3 gap-2 border-0 border-line border-t border-solid pt-2.5 ${d.online ? '' : 'opacity-55'}`}
        >
          {sensors.map((s) => {
            const r = readSensor(s, rt?.sensors)
            const alert = r.state === 'over' || r.state === 'under'
            return (
              <span key={s.channelNum} className="min-w-0">
                <span className="block truncate text-fg-tertiary text-[11px]">{r.name}</span>
                <span className={`block truncate font-medium tabular-nums ${alert ? 'text-warning' : 'text-fg'}`}>
                  {rt ? r.text : '…'}
                  {rt && r.value != null && s.unit && (
                    <span className="ml-0.5 font-normal text-fg-tertiary text-xs">{s.unit}</span>
                  )}
                </span>
              </span>
            )
          })}
        </span>
      )}
    </button>
  )
}
