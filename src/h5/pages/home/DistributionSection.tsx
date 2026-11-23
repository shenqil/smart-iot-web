import { appDeviceSummaryQuery } from '@shared/api/device'
import { useDeviceTypes } from '@shared/api/dict'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useCompanyId } from '@/hooks/session'
import { DistributionChart } from '../../components/metrics'
import { Card, Empty, Loading } from '../../ui'
import { deviceTypeColor } from './deviceTypeColor'

export function DistributionSection() {
  const cid = useCompanyId(),
    base = `/h5/${cid}`
  const summary = useQuery(appDeviceSummaryQuery(cid))
  const types = useDeviceTypes()
  const stats = summary.data
  const total = stats?.deviceCount ?? 0
  const distribution = [...(stats?.deviceTypes ?? [])].sort((a, b) => b.count - a.count)
  return (
    <Card title="设备类型分布" extra={<Link to={`${base}/devices`}>全部设备 ›</Link>}>
      {summary.isPending ? (
        <Loading />
      ) : !stats ? (
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
            color: deviceTypeColor(t.deviceTypeId),
            to: t.deviceTypeId == null ? `${base}/devices` : `${base}/devices?deviceTypeId=${t.deviceTypeId}`,
          }))}
        />
      )}
    </Card>
  )
}
