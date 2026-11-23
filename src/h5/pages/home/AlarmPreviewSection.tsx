import { alarmsQuery } from '@shared/api/alarm'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useCompanyId } from '@/hooks/session'
import { fmtDateTime } from '@/lib/time'
import { Card, Empty, Failure, Loading } from '../../ui'

const LEVELS = ['', '紧急', '重要', '警告', '提示']

export function AlarmPreviewSection() {
  const cid = useCompanyId(),
    base = `/h5/${cid}`
  const alarms = useQuery(alarmsQuery(cid, { processed: 'false', pageSize: 3 }))
  return (
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
            <span className={`h5-level level-${a.level}`}>{LEVELS[a.level] ?? '告警'}</span>
            <div>
              <strong>{a.description || '设备告警'}</strong>
              <small>
                {a.deviceName} · {fmtDateTime(a.lastAlarmAt)}
              </small>
            </div>
            <span>›</span>
          </Link>
        ))
      )}
    </Card>
  )
}
