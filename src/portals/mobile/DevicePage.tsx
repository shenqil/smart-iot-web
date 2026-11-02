import { useQuery } from '@tanstack/react-query'
import { Button } from 'antd-mobile'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useDeviceTypes } from '@/features/dict/api'
import { appSitesQuery } from '@/features/site/api'
import { agoText, byChannel } from '@/features/telemetry/lib/realtime'
import { realtimeQuery } from '@/features/telemetry/realtime/api'
import { useCompanyId, useMe } from '@/hooks/session'
import { useNow } from '@/hooks/useNow'
import { fmtDateTime } from '@/lib/time'
import { mobileDeviceQuery } from './api'
import { DeviceStatus, deviceOnline } from './components/DeviceStatus'
import { SensorTile } from './components/SensorTile'
import { positiveId } from './filters'
import { preferenceKey, useMobilePreferences } from './preferences'
import RelayPanel from './RelayPanel'
import { Card, Choice, Empty, Failure, Loading, Notice, Page, Sheet, useVisible } from './ui'

const Analysis = lazy(() => import('./AnalysisPanel'))
const Video = lazy(() => import('./VideoPanel'))

export default function DevicePage({ id }: { id: number }) {
  const navigate = useNavigate(),
    cid = useCompanyId(),
    me = useMe(),
    [params, setParams] = useSearchParams(),
    siteId = positiveId(params.get('siteId')),
    visible = useVisible(),
    device = useQuery({ ...mobileDeviceQuery(cid, id, siteId), enabled: visible, refetchInterval: 30_000 }),
    d = device.data
  const rt = useQuery({
      ...realtimeQuery(cid, id),
      enabled:
        visible &&
        !['history', 'comparison'].includes(params.get('tab') ?? '') &&
        !!d &&
        !!(d.sensors.length || d.relays.length),
    }),
    now = useNow(10_000)
  const sites = useQuery(appSitesQuery(cid)),
    types = useDeviceTypes(),
    [switching, setSwitching] = useState(false)
  const prefs = useMobilePreferences(),
    entry = prefs.entries[preferenceKey(me.id, cid)],
    fav = entry?.favorites.some((x) => x.id === id),
    base = `/h5/${cid}`
  const tab = params.get('tab') ?? 'realtime',
    active =
      ['history', 'comparison'].includes(tab) && d?.sensors.length
        ? tab
        : tab === 'video' && d?.hasCamera
          ? 'video'
          : 'realtime'
  const visitedId = device.data?.id,
    visitedName = device.data?.name
  useEffect(() => {
    if (visitedId && visitedName)
      useMobilePreferences.getState().visit(me.id, cid, { id: visitedId, name: visitedName, siteId })
  }, [visitedId, visitedName, me.id, cid, siteId])
  const known = d?.onlineKnown !== false,
    online = deviceOnline(d, rt.data),
    stale = !!(
      online &&
      rt.data?.sensorsAt &&
      d &&
      now - Date.parse(rt.data.sensorsAt) > Math.max(60, d.readInterval * 3) * 1000
    )
  const tabItems = [
    ...(d?.sensors.length || d?.relays.length
      ? [
          { key: 'realtime', title: '实时监控' },
          ...(d.sensors.length
            ? [
                { key: 'history', title: '历史曲线' },
                { key: 'comparison', title: '日 / 月环比' },
              ]
            : []),
        ]
      : []),
    ...(d?.hasCamera && (d.sensors.length || d.relays.length) ? [{ key: 'video', title: '视频' }] : []),
  ]
  return (
    <Page
      title={
        <>
          <span className="h5-title-label">{d?.name ?? '设备'}</span>
          <DeviceStatus online={online} />
        </>
      }
      titleClick={() => setSwitching(true)}
      right={
        <Button fill="none" size="small" onClick={() => setSwitching(true)}>
          切换
        </Button>
      }
      tabs={tabItems.length ? tabItems : undefined}
      tab={active}
      onTab={(v) =>
        setParams(
          (old) => {
            const p = new URLSearchParams(old)
            p.set('tab', v)
            return p
          },
          { replace: true },
        )
      }
    >
      {device.isPending ? (
        <Loading />
      ) : device.isError ? (
        <Failure
          error={device.error}
          retry={() => {
            void device.refetch()
          }}
        />
      ) : (
        d && (
          <>
            <div className="h5-hero">
              <h1>{d.name}</h1>
              <p>
                {siteId ? `${sites.data?.find((s) => s.id === siteId)?.name ?? '当前园区'} · ` : ''}
                {types.nameOf(d.deviceTypeId)} ·{' '}
                {d.status === 'active' ? '启用' : d.status === 'inactive' ? '停用' : '故障'}
              </p>
              <p>
                SN {d.deviceSn} · 采集周期 {d.readInterval} 秒
              </p>
              <p>数据更新 {fmtDateTime(rt.data?.sensorsAt ?? rt.data?.relaysAt)}</p>
            </div>
            <div className="h5-row">
              <Button
                size="small"
                fill="outline"
                onClick={() => prefs.toggle(me.id, cid, { id: d.id, name: d.name, siteId })}
              >
                {fav ? '★ 已关注' : '☆ 关注'}
              </Button>
              <Link to={`${base}/device-info?deviceId=${id}`}>设备详情 ›</Link>
            </div>
            {active === 'history' || active === 'comparison' ? (
              <Suspense fallback={<Loading />}>
                <Analysis key={d.id} device={d} mode={active} />
              </Suspense>
            ) : active === 'video' || (d.hasCamera && !d.sensors.length && !d.relays.length) ? (
              <Suspense fallback={<Loading />}>
                <Video key={d.id} device={d} />
              </Suspense>
            ) : (
              <>
                {online === false && <Notice>设备离线，显示最后一次数据；离线期间不能控制。</Notice>}
                {!known && <Notice tone="warning">在线服务暂不可用，设备状态未知；请稍后刷新。</Notice>}
                {stale && <Notice tone="warning">设备仍在线，但传感器数据已超过三个采集周期未更新。</Notice>}
                {!!d.sensors.length && (
                  <Card
                    title="实时数据"
                    extra={
                      <Button
                        size="mini"
                        fill="none"
                        loading={rt.isFetching}
                        onClick={async () => {
                          await rt.refetch()
                        }}
                      >
                        刷新
                      </Button>
                    }
                  >
                    {rt.isError && <p className="h5-warning">刷新失败{rt.data ? '，保留上次读数' : '，请重试'}</p>}
                    <p className="h5-muted">更新于 {agoText(rt.data?.sensorsAt, now)}</p>
                    <div className="h5-grid-two">
                      {byChannel(d.sensors).map((sensor) => (
                        <SensorTile key={sensor.channel} sensor={sensor} values={rt.data?.sensors} online={online} />
                      ))}
                    </div>
                  </Card>
                )}
                {!!d.relays.length && (
                  <RelayPanel key={d.id} device={d} realtime={rt.data} realtimeError={rt.isError} />
                )}
                {!d.sensors.length && !d.relays.length && !d.hasCamera && (
                  <Empty title="尚未配置传感器、继电器或摄像头">请联系企业管理员配置通道</Empty>
                )}
                <div className="h5-grid-two">
                  <Link
                    className="h5-navigation-card"
                    to={`${base}/alarms?deviceId=${id}${siteId ? `&siteId=${siteId}` : ''}`}
                  >
                    设备告警 ›
                  </Link>
                  <Link
                    className="h5-navigation-card"
                    to={`${base}/operations?deviceId=${id}${siteId ? `&siteId=${siteId}` : ''}`}
                  >
                    操作记录 ›
                  </Link>
                </div>
              </>
            )}
          </>
        )
      )}
      <Sheet title="切换设备" visible={switching} close={() => setSwitching(false)}>
        <p className="h5-muted">选择当前园区的其他设备</p>
        <Link className="h5-navigation-card" to={`${base}/devices${siteId ? `?siteId=${siteId}` : ''}`}>
          打开设备选择列表 ›
        </Link>
        <Choice
          label="切换园区"
          value={siteId ? String(siteId) : ''}
          options={[
            { label: '全部园区', value: '' },
            ...(sites.data ?? []).map((s) => ({ label: s.name, value: String(s.id) })),
          ]}
          onChange={(v) => {
            navigate(`${base}/devices${v ? `?siteId=${v}` : ''}`)
          }}
        />
      </Sheet>
    </Page>
  )
}
