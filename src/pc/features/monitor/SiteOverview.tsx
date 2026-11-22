import { CloudOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Card, Empty, Skeleton } from 'antd'
import { Link } from 'react-router'
import { DeviceMap } from '@/components/map/DeviceMap'
import { EnumTag, SITE_STATUS } from '@/components/StatusTag'
import { alarmsQuery, formatUnprocessedCount, scopedUnprocessedCountQuery } from '@/features/alarm/api'
import { AlarmLevelTag } from '@/features/alarm/enums'
import { appSiteDevicesQuery } from '@/features/device/api'
import { useDeviceTypes } from '@/features/dict/api'
import { appSitesQuery, weatherQuery } from '@/features/site/api'
import { parseGeofences } from '@/features/site/tenant/geofence/model'
import { agoText } from '@/features/telemetry/lib/realtime'
import { useCompanyId } from '@/hooks/session'
import { useScope } from '@/layouts/app/useScope'
import { fmtDateTime } from '@/lib/time'

/**
 * 园区总览 (FRONTEND_DESIGN §5.2)
 * 概况 (设备 / 在线 / 离线 / 未处理告警 / 天气) → 设备分布 (含电子围栏) + 最新告警，占满剩余高度
 */
export function SiteOverview({ siteId }: { siteId: number }) {
  const companyId = useCompanyId()
  const { select } = useScope()
  const site = useQuery(appSitesQuery(companyId)).data?.find((s) => s.id === siteId)
  const devices = useQuery(appSiteDevicesQuery(companyId, siteId))
  const alarm = useQuery(scopedUnprocessedCountQuery(companyId, { siteId })).data
  // 设备级未处理告警数 (与设备树共用同一个查询)
  const unprocessed = useQuery({
    ...alarmsQuery(companyId, { siteId, processed: 'false', pageSize: 200 }),
    meta: { silent: true },
  }).data
  const latest = useQuery(alarmsQuery(companyId, { siteId, processed: 'false', pageSize: 8 }))
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
  const geofences = parseGeofences(site?.properties)
  const siteCenter =
    site?.latitude != null && site?.longitude != null
      ? ([site.latitude, site.longitude] as [number, number])
      : undefined
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
      className="layout-fill h-full min-h-0 overflow-hidden"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      styles={{ body: { display: 'flex', flexDirection: 'column', flex: '1 1 0%', minHeight: 0, overflow: 'auto' } }}
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
                <AlarmLevelTag level={a.level} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-fg">{a.description || '告警'}</span>
                  <span className="block truncate text-fg-tertiary text-xs">{a.deviceName}</span>
                </span>
                <span className="shrink-0 text-fg-tertiary text-xs" title={fmtDateTime(a.createdAt)}>
                  {agoText(a.createdAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )

  return (
    <div className="layout-fill gap-4">
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
                {weather.windDirection && `，${weather.windDirection} ${weather.windPower}`}
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
            value={alarm ? formatUnprocessedCount(alarm) : '…'}
            tone={alarm?.count ? 'danger' : undefined}
          />
        </Link>
      </div>

      <div
        className="layout-fill grid min-h-0 grid-cols-1 grid-rows-2 gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:grid-rows-1"
        style={{ flex: '1 1 0%', minHeight: 0 }}
      >
        <Card
          variant="borderless"
          title="设备分布"
          className="layout-fill h-full min-h-0 overflow-hidden"
          style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
          styles={{
            body: { display: 'flex', flexDirection: 'column', flex: '1 1 0%', minHeight: 0, overflow: 'hidden' },
          }}
        >
          <DeviceMap
            key={siteId}
            fill
            center={siteCenter}
            geofences={geofences}
            devices={list.map((d) => ({
              ...d,
              alarms: alarmsOf.get(d.id) ?? 0,
              typeName: types.nameOf(d.deviceTypeId),
              iconUrl: d.deviceTypeId != null ? types.byId.get(d.deviceTypeId)?.iconUrl || undefined : undefined,
            }))}
            onSelect={(id) => select({ siteId, deviceId: id })}
          />
        </Card>
        {latestCard}
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
