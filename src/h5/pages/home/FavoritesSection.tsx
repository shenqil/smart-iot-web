import { Link } from 'react-router'
import { useCompanyId, useMe } from '@/hooks/session'
import { DeviceBookmarkCard } from '../../deviceCards'
import { preferenceKey, useMobilePreferences } from '../../preferences'
import { Card, Empty } from '../../ui'

export function FavoritesSection() {
  const cid = useCompanyId(),
    me = useMe(),
    base = `/h5/${cid}`
  const entry = useMobilePreferences((s) => s.entries[preferenceKey(me.id, cid)])
  return (
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
  )
}
