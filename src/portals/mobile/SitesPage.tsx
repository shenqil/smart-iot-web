import { useQuery } from '@tanstack/react-query'
import { Button, List } from 'antd-mobile'
import { Link, useNavigate, useParams } from 'react-router'
import { alarmsQuery, scopedUnprocessedCountQuery } from '@/features/alarm/api'
import { appDeviceSummaryQuery } from '@/features/device/api'
import { appSitesQuery, weatherQuery } from '@/features/site/api'
import { useCompanyId } from '@/hooks/session'
import { SitePreview } from './components/SiteCard'
import { Card, Empty, Failure, Loading, Page, StatRing } from './ui'

export default function SitesPage() {
  const navigate = useNavigate(),
    cid = useCompanyId(),
    { siteId } = useParams(),
    id = Number(siteId),
    query = useQuery(appSitesQuery(cid)),
    site = query.data?.find((s) => s.id === id)
  const summary = useQuery({ ...appDeviceSummaryQuery(cid, id), enabled: !!siteId && !!site }),
    counts = useQuery({ ...scopedUnprocessedCountQuery(cid, { siteId: id }), enabled: !!siteId && !!site })
  const weather = useQuery({
    ...weatherQuery(site?.latitude ?? 0, site?.longitude ?? 0),
    enabled: site?.latitude != null && site?.longitude != null,
  })
  const latest = useQuery({
    ...alarmsQuery(cid, { siteId: id, processed: 'false', sort: 'level,-lastAlarmAt', page: 1, pageSize: 3 }),
    enabled: !!site,
  })
  const base = `/h5/${cid}`,
    s = summary.data
  return (
    <Page title={siteId ? (site?.name ?? '园区') : '我的园区'}>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <Failure
          error={query.error}
          retry={() => {
            void query.refetch()
          }}
        />
      ) : siteId && !site ? (
        <Empty title="园区不存在或已无权访问">
          <Link to={`${base}/sites`}>重新选择园区</Link>
        </Empty>
      ) : !siteId ? (
        query.data?.length ? (
          query.data.map((s) => <SitePreview key={s.id} site={s} />)
        ) : (
          <Empty title="暂无园区" />
        )
      ) : (
        site && (
          <>
            <div className="h5-hero">
              <h1>{site.name}</h1>
              <p>{[site.province, site.city, site.district, site.address].filter(Boolean).join(' ') || '未填写地址'}</p>
              <p>
                {weather.data
                  ? `${weather.data.weather} ${weather.data.temperature}℃ · 湿度 ${weather.data.humidity}%${weather.data.stale ? '（旧天气数据）' : ''}`
                  : '天气暂不可用'}
              </p>
            </div>
            <Card title="园区概况">
              {summary.isError ? (
                <Failure
                  error={summary.error}
                  retry={() => {
                    void summary.refetch()
                  }}
                />
              ) : s ? (
                <div className="h5-row">
                  <StatRing
                    value={s.onlineKnown && s.deviceCount ? (s.onlineCount / s.deviceCount) * 100 : null}
                    label="在线率"
                  />
                  <div className="h5-stack">
                    <span>设备 {s.deviceCount} 台</span>
                    <span>
                      在线 {s.onlineKnown ? s.onlineCount : '—'} · 离线 {s.onlineKnown ? s.offlineCount : '—'}
                    </span>
                    <Link to={`${base}/alarms?siteId=${id}&processed=false`}>
                      未处理告警 {counts.data ? (counts.data.capped ? '999+' : counts.data.count) : '—'} ›
                    </Link>
                  </div>
                </div>
              ) : (
                <Loading />
              )}
            </Card>
            <div className="h5-grid-two">
              <Button
                color="primary"
                onClick={() => {
                  navigate(`${base}/devices?siteId=${id}`)
                }}
              >
                查看设备
              </Button>
              <Button
                onClick={() => {
                  navigate(`${base}/map?siteId=${id}`)
                }}
              >
                设备分布
              </Button>
            </div>
            <Card
              title="园区最新告警"
              extra={<Link to={`${base}/alarms?siteId=${id}&processed=false`}>查看全部 ›</Link>}
            >
              {latest.isPending ? (
                <Loading />
              ) : latest.isError ? (
                <Failure error={latest.error} retry={() => void latest.refetch()} />
              ) : latest.data?.records.length ? (
                latest.data.records.map((a) => (
                  <Link className="h5-list-link" key={a.id} to={`${base}/alarms/${a.id}`}>
                    <strong>{a.description || '设备告警'}</strong>
                    <small className="h5-muted"> · {a.deviceName}</small>
                  </Link>
                ))
              ) : (
                <Empty title="暂无未处理告警" />
              )}
            </Card>
            <Card title="园区资料">
              <List>
                <List.Item extra={site.status}>状态</List.Item>
                <List.Item extra={site.name}>名称</List.Item>
                <List.Item>{site.description || '暂无介绍'}</List.Item>
              </List>
              {site.images?.map((url) => (
                <img className="h5-site-photo" src={url} key={url} alt={`${site.name}园区照片`} loading="lazy" />
              ))}
            </Card>
          </>
        )
      )}
    </Page>
  )
}
