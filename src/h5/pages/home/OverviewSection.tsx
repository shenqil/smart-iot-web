import { formatUnprocessedCount, scopedUnprocessedCountQuery } from '@shared/api/alarm'
import { appDeviceSummaryQuery } from '@shared/api/device'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useCompanyId, useCurrentCompany } from '@/hooks/session'
import { fmtDate } from '@/lib/time'
import { MetricGrid } from '../../components/metrics'
import { Card, Failure, Loading, Notice } from '../../ui'

function companyMeta(company: NonNullable<ReturnType<typeof useCurrentCompany>>) {
  const role = company.role === 'admin' ? '管理员' : '成员'
  const status = company.status === 'active' ? '正常' : '已停用'
  const expiry = company.expiredAt ? `有效期至 ${fmtDate(company.expiredAt)}` : '长期有效'
  return `${role} · ${status} · ${expiry}`
}

export function OverviewSection() {
  const cid = useCompanyId(),
    company = useCurrentCompany(),
    base = `/h5/${cid}`
  const summary = useQuery(appDeviceSummaryQuery(cid))
  const count = useQuery(scopedUnprocessedCountQuery(cid, {}))
  const stats = summary.data
  return (
    <Card className="h5-overview" title="企业运行概况" extra={<Link to={`${base}/company-info`}>企业资料 ›</Link>}>
      <div className="h5-company">
        <span className="h5-company-mark">
          {company?.logo ? <img src={company.logo} alt="" /> : (company?.name ?? '企').slice(0, 1)}
        </span>
        <div>
          <strong>{company?.name ?? '当前企业'}</strong>
          {company && <small>{companyMeta(company)}</small>}
        </div>
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
          <>
            {summary.isError && <Notice tone="warning">刷新失败，显示上次数据</Notice>}
            <MetricGrid
              items={[
                { label: '园区', value: stats.siteCount, to: `${base}/sites` },
                { label: '设备', value: stats.deviceCount, to: `${base}/devices` },
              ]}
            />
            <Link className="h5-alarm-strip" to={`${base}/alarms?processed=false`}>
              <span>待处理告警</span>
              <b>{count.data ? `${formatUnprocessedCount(count.data)} 条` : '—'} ›</b>
            </Link>
          </>
        )
      )}
    </Card>
  )
}
