import { Link } from 'react-router'
import { useCompanyId, useMe } from '@/hooks/session'
import { preferenceKey, useMobilePreferences } from '../../preferences'
import { Card } from '../../ui'

export function RecentSection() {
  const cid = useCompanyId(),
    me = useMe(),
    base = `/h5/${cid}`
  const entry = useMobilePreferences((s) => s.entries[preferenceKey(me.id, cid)])
  if (!entry?.recent.length) return null
  return (
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
  )
}
