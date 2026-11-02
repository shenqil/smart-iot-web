import { useQuery } from '@tanstack/react-query'
import { Button, PullToRefresh } from 'antd-mobile'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { queryClient } from '@/app/queryClient'
import { alarmsQuery, scopedUnprocessedCountQuery } from '@/features/alarm/api'
import { appDeviceSummaryQuery } from '@/features/device/api'
import { useDeviceTypes } from '@/features/dict/api'
import { appSitesQuery, type SiteView } from '@/features/site/api'
import { useCompanyId, useCurrentCompany, useMe, useMyCompanies } from '@/hooks/session'
import { useInView } from '@/hooks/useInView'
import { DeviceBookmarkCard } from './deviceCards'
import { preferenceKey, useMobilePreferences } from './preferences'
import { Card, Empty, Failure, Icon, Loading, Page, Sheet, StatRing } from './ui'

export default function HomePage() {
  const cid = useCompanyId(),
    me = useMe(),
    company = useCurrentCompany(),
    companies = useMyCompanies(),
    navigate = useNavigate()
  const base = `/h5/${cid}`,
    [switching, setSwitching] = useState(false),
    [quick, setQuick] = useState(false)
  const movement = useRef({ y: 0, direction: 0 })
  const summary = useQuery(appDeviceSummaryQuery(cid)),
    sites = useQuery(appSitesQuery(cid))
  const count = useQuery(scopedUnprocessedCountQuery(cid, {}))
  const alarms = useQuery(alarmsQuery(cid, { processed: 'false', sort: 'level,-lastAlarmAt', page: 1, pageSize: 3 }))
  const types = useDeviceTypes(),
    entry = useMobilePreferences((s) => s.entries[preferenceKey(me.id, cid)])
  const stats = summary.data,
    total = stats?.deviceCount ?? 0
  const distribution = [...(stats?.deviceTypes ?? [])].sort((a, b) => b.count - a.count)
  const colors = ['#0f766e', '#348dc0', '#8c7cd1', '#d5aa49', '#58a6a0', '#94a3b8']
  let cursor = 0
  const slices = distribution.slice(0, 5),
    rest = distribution.slice(5).reduce((n, t) => n + t.count, 0)
  const chartRows = [
    ...slices.map((t) => ({ ...t, label: types.nameOf(t.deviceTypeId), other: false })),
    ...(rest ? [{ count: rest, deviceTypeId: null, label: '其他', other: true }] : []),
  ]
  const gradient = chartRows
    .map((t, i) => {
      const start = cursor
      cursor += total ? (t.count / total) * 100 : 0
      return `${colors[i]} ${start}% ${cursor}%`
    })
    .join(',')
  const shortcuts = [
    ['sensor', '数据采集', 'devices?capability=sensor'],
    ['relay', '远程控制', 'devices?capability=relay'],
    ['camera', '视频/苗情', 'devices?capability=camera'],
    ['chart', '历史分析', 'devices?capability=sensor&goal=history'],
    ['map', '园区地图', 'map'],
  ]
  return (
    <>
      <Page
        title={
          <>
            <span className="h5-brand">智能物联网</span>
            {company?.name}⌄
          </>
        }
        back={false}
        titleClick={() => setSwitching(true)}
        right={
          <Button fill="none" onClick={() => navigate(`${base}/me`)} aria-label="我的账户">
            <Icon name="me" />
          </Button>
        }
        onScroll={(el) => {
          const max = el.scrollHeight - el.clientHeight,
            y = el.scrollTop,
            movementState = movement.current
          if (max <= 0) return
          if (max - y <= 20) {
            setQuick(true)
            movementState.y = y
            movementState.direction = 0
            return
          }
          const delta = y - movementState.y,
            dir = Math.sign(delta)
          if (dir !== movementState.direction && Math.abs(delta) > 2) {
            movementState.direction = dir
            movementState.y = y
            return
          }
          if (Math.abs(delta) >= 16) {
            setQuick(delta < 0)
            movementState.y = y
          }
        }}
      >
        <PullToRefresh
          onRefresh={async () => {
            await queryClient.invalidateQueries({ queryKey: ['app', cid] })
          }}
        >
          <div className="h5-home-stack">
            {summary.isPending ? (
              <Loading />
            ) : summary.isError && !stats ? (
              <Failure
                error={summary.error}
                retry={() => {
                  void summary.refetch()
                }}
              />
            ) : (
              stats && (
                <Card className="h5-overview" title="企业运行概况" extra={<span className="h5-muted">当前企业</span>}>
                  {summary.isError && <p className="h5-warning">刷新失败，显示上次数据</p>}
                  <div className="h5-row">
                    <StatRing
                      value={stats.onlineKnown && total ? (stats.onlineCount / total) * 100 : null}
                      label="设备在线率"
                    />
                    <div>
                      <p className="h5-eyebrow">CONNECTED DEVICES</p>
                      <h3>每一台设备，尽在掌握</h3>
                      <small className="h5-muted">
                        {stats.onlineKnown
                          ? `在线 ${stats.onlineCount} · 离线 ${stats.offlineCount}`
                          : `在线状态未知 ${stats.unknownCount} 台`}
                      </small>
                    </div>
                  </div>
                  <div className="h5-metrics">
                    {[
                      ['园区', stats.siteCount, 'sites'],
                      ['设备', total, 'devices'],
                      ['在线', stats.onlineKnown ? stats.onlineCount : '—', 'devices?online=true'],
                      ['离线', stats.onlineKnown ? stats.offlineCount : '—', 'devices?online=false'],
                    ].map(([label, value, path]) => (
                      <Link key={path} to={`${base}/${path}`}>
                        <strong>{value}</strong>
                        <span>{label}</span>
                      </Link>
                    ))}
                  </div>
                  <Link className="h5-alarm-strip" to={`${base}/alarms?processed=false`}>
                    <span>待处理告警</span>
                    <b>{count.data ? `${count.data.capped ? '999+' : count.data.count} 条` : '—'} ›</b>
                  </Link>
                </Card>
              )
            )}
            <Card title="设备类型分布" extra={<Link to={`${base}/devices`}>全部设备 ›</Link>}>
              {!stats ? (
                <p className="h5-muted">统计暂不可用</p>
              ) : !total ? (
                <Empty title="暂无设备" />
              ) : (
                <div className="h5-distribution">
                  <div
                    className="h5-type-ring"
                    style={{ background: `conic-gradient(${gradient})` }}
                    role="img"
                    aria-label={`设备总数 ${total} 台，按类型分布`}
                  >
                    <div>
                      <strong>{total}</strong>
                      <small>设备总数 / 台</small>
                    </div>
                  </div>
                  <div className="h5-type-legend">
                    {chartRows.map((t, i) => (
                      <Link
                        key={t.other ? 'other' : (t.deviceTypeId ?? 'none')}
                        to={`${base}/devices${t.other ? '' : t.deviceTypeId == null ? '?unclassified=true' : `?deviceTypeId=${t.deviceTypeId}`}`}
                      >
                        <i style={{ background: colors[i] }} />
                        <span>{t.label}</span>
                        <b>{t.count}</b>
                        <small>{((t.count / total) * 100).toFixed(0)}%</small>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </Card>
            <Card title="待处理告警" extra={<Link to={`${base}/alarms?processed=false`}>查看全部 ›</Link>}>
              {alarms.isPending ? (
                <Loading />
              ) : alarms.isError ? (
                <Failure
                  error={alarms.error}
                  retry={() => {
                    void alarms.refetch()
                  }}
                />
              ) : !alarms.data?.records.length ? (
                <Empty title="暂无未处理告警" />
              ) : (
                alarms.data.records.map((a) => (
                  <Link className="h5-alarm-preview" key={a.id} to={`${base}/alarms/${a.id}`}>
                    <span className={`h5-level level-${a.level}`}>
                      {['', '紧急', '重要', '警告', '提示'][a.level] ?? '告警'}
                    </span>
                    <div>
                      <strong>{a.description || '设备告警'}</strong>
                      <small>
                        {a.deviceName} · {a.alarmCount} 次
                      </small>
                    </div>
                    <span>›</span>
                  </Link>
                ))
              )}
            </Card>
            <Card title="我的关注" extra={<Link to={`${base}/devices?mode=favorites`}>查看全部 ›</Link>}>
              {!entry?.favorites.length ? (
                <Empty title="关注常用设备，快速查看读数">
                  <Link to={`${base}/devices`}>去选择设备 ›</Link>
                </Empty>
              ) : (
                <div className="h5-grid-two">
                  {entry.favorites.slice(0, 4).map((d) => (
                    <DeviceBookmarkCard key={d.id} bookmark={d} />
                  ))}
                </div>
              )}
            </Card>
            <div className="h5-section-head">
              <h2>我的园区</h2>
              <Link to={`${base}/sites`}>全部园区 ›</Link>
            </div>
            {sites.isPending ? (
              <Loading />
            ) : sites.isError ? (
              <Failure
                error={sites.error}
                retry={() => {
                  void sites.refetch()
                }}
              />
            ) : !sites.data?.length ? (
              <Empty title="暂无可查看的园区">请联系企业管理员创建园区并挂载设备</Empty>
            ) : (
              sites.data.slice(0, 6).map((site) => <SitePreview key={site.id} site={site} />)
            )}
            {!!entry?.recent.length && (
              <Card title="最近访问" extra={<Link to={`${base}/devices?mode=recent`}>查看全部 ›</Link>}>
                {entry.recent.slice(0, 5).map((d) => (
                  <Link
                    className="h5-list-link"
                    key={d.id}
                    to={`${base}/devices?deviceId=${d.id}${d.siteId ? `&siteId=${d.siteId}` : ''}`}
                  >
                    {d.name} ›
                  </Link>
                ))}
              </Card>
            )}
            <div className="h5-home-tail" />
          </div>
        </PullToRefresh>
      </Page>
      {!quick && (
        <button type="button" className="h5-fab" onClick={() => setQuick(true)} aria-label="打开快捷入口">
          <Icon name="devices" size={18} />
          快捷
        </button>
      )}
      {quick && (
        <div className="h5-quick-dock">
          <div className="h5-row">
            <span>快捷入口</span>
            <Button
              size="mini"
              fill="none"
              onClick={() => {
                setQuick(false)
                movement.current.direction = 0
              }}
            >
              收起
            </Button>
          </div>
          <div className="h5-shortcuts">
            {shortcuts.map(([icon, label, path]) => (
              <Link key={path} to={`${base}/${path}`}>
                <Icon name={icon} />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <Sheet title="切换企业" visible={switching} close={() => setSwitching(false)}>
        {companies
          .filter((c) => c.accessible)
          .map((c) => (
            <Button
              block
              key={c.companyId}
              fill={c.companyId === cid ? 'solid' : 'outline'}
              color={c.companyId === cid ? 'primary' : 'default'}
              onClick={() => {
                setSwitching(false)
                navigate(`/h5/${c.companyId}/home`, { replace: true })
              }}
            >
              {c.name}
              {c.companyId === cid ? ' ✓' : ''}
            </Button>
          ))}
      </Sheet>
    </>
  )
}

export function SitePreview({ site }: { site: SiteView }) {
  const cid = useCompanyId(),
    { ref, inView } = useInView<HTMLDivElement>()
  const q = useQuery({ ...appDeviceSummaryQuery(cid, site.id), enabled: inView }),
    s = q.data
  return (
    <div ref={ref}>
      <Link className="h5-site-card" to={`/h5/${cid}/sites/${site.id}`}>
        <div className="h5-site-cover">
          {site.coverImage ? <img src={site.coverImage} alt="" loading="lazy" /> : <Icon name="map" size={25} />}
        </div>
        <div className="h5-site-copy">
          <strong>{site.name}</strong>
          <small>{[site.city, site.district, site.address].filter(Boolean).join(' ') || '园区资料待完善'}</small>
          <small>在线 {s?.onlineKnown ? `${s.onlineCount} / ${s.deviceCount}` : '—'}</small>
          <div className="h5-track">
            <span
              style={{ width: `${s?.onlineKnown && s.deviceCount ? (s.onlineCount / s.deviceCount) * 100 : 0}%` }}
            />
          </div>
        </div>
        <span>›</span>
      </Link>
    </div>
  )
}
