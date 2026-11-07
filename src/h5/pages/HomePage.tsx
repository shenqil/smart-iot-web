import { alarmsQuery, scopedUnprocessedCountQuery } from '@shared/api/alarm'
import { appDeviceSummaryQuery } from '@shared/api/device'
import { useDeviceTypes } from '@shared/api/dict'
import { appSitesQuery } from '@shared/api/site'
import { queryClient } from '@shared/queryClient'
import { useQuery } from '@tanstack/react-query'
import { Button, PullToRefresh } from 'antd-mobile'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useCompanyId, useCurrentCompany, useMe, useMyCompanies } from '@/hooks/session'
import { DistributionChart, MetricGrid } from '../components/metrics'
import { QuickActions, useQuickActions } from '../components/QuickActions'
import { SitePreview } from '../components/SiteCard'
import { DeviceBookmarkCard } from '../deviceCards'
import { preferenceKey, useMobilePreferences } from '../preferences'
import { Card, Empty, Failure, Icon, Loading, Notice, Page, SectionHeading, Sheet, StatRing } from '../ui'

export default function HomePage() {
  const cid = useCompanyId(),
    me = useMe(),
    company = useCurrentCompany(),
    companies = useMyCompanies(),
    navigate = useNavigate()
  const base = `/h5/${cid}`,
    [switching, setSwitching] = useState(false)
  const quick = useQuickActions()
  const summary = useQuery(appDeviceSummaryQuery(cid)),
    sites = useQuery(appSitesQuery(cid))
  const count = useQuery(scopedUnprocessedCountQuery(cid, {}))
  const alarms = useQuery(alarmsQuery(cid, { processed: 'false', sort: 'level,-lastAlarmAt', page: 1, pageSize: 3 }))
  const types = useDeviceTypes(),
    entry = useMobilePreferences((s) => s.entries[preferenceKey(me.id, cid)])
  const stats = summary.data,
    total = stats?.deviceCount ?? 0
  const distribution = [...(stats?.deviceTypes ?? [])].sort((a, b) => b.count - a.count)
  return (
    <>
      <Page
        title={
          <>
            <span className="h5-brand">智能物联网</span>
            <span>{company?.name ?? '选择企业'}</span>
          </>
        }
        back={false}
        titleClick={() => setSwitching(true)}
        right={
          <Button fill="none" onClick={() => navigate(`${base}/me`)} aria-label="我的账户">
            <Icon name="me" />
          </Button>
        }
        onScroll={quick.onScroll}
      >
        <PullToRefresh
          onRefresh={async () => {
            await queryClient.invalidateQueries({ queryKey: ['app', cid] })
          }}
        >
          <div className="h5-home-stack">
            <div className="h5-home-welcome">
              <p className="h5-eyebrow">FIELD INSIGHTS</p>
              <h1>园区尽在掌握</h1>
              <p>从设备状态，到每一份生长。</p>
            </div>
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
                  {summary.isError && <Notice tone="warning">刷新失败，显示上次数据</Notice>}
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
                  <MetricGrid
                    items={[
                      { label: '园区', value: stats.siteCount, to: `${base}/sites` },
                      { label: '设备', value: total, to: `${base}/devices` },
                      {
                        label: '在线',
                        value: stats.onlineKnown ? stats.onlineCount : '—',
                        to: `${base}/devices`,
                      },
                      {
                        label: '离线',
                        value: stats.onlineKnown ? stats.offlineCount : '—',
                        to: `${base}/devices`,
                      },
                    ]}
                  />
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
                <DistributionChart
                  total={total}
                  items={distribution.map((t) => ({
                    key: String(t.deviceTypeId ?? 'none'),
                    label: types.nameOf(t.deviceTypeId),
                    count: t.count,
                    to: `${base}/devices?${t.deviceTypeId == null ? 'unclassified=true' : `deviceTypeId=${t.deviceTypeId}`}`,
                  }))}
                />
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
            <SectionHeading title="我的园区" extra={<Link to={`${base}/sites`}>全部园区 ›</Link>} />
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
      <QuickActions base={base} visible={quick.visible} open={quick.open} close={quick.close} />
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
