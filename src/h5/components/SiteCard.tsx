import { appDeviceSummaryQuery } from '@shared/api/device'
import type { SiteView } from '@shared/api/site'
import { useQuery } from '@tanstack/react-query'
import { ProgressBar } from 'antd-mobile'
import { Link } from 'react-router'
import { useCompanyId } from '@/hooks/session'
import { useInView } from '@/hooks/useInView'
import { Icon } from './Icon'
export function SitePreview({ site }: { site: SiteView }) {
  const cid = useCompanyId(),
    { ref, inView } = useInView<HTMLDivElement>()
  const q = useQuery({ ...appDeviceSummaryQuery(cid, site.id), enabled: inView }),
    s = q.data
  const percent = s?.onlineKnown && s.deviceCount ? (s.onlineCount / s.deviceCount) * 100 : 0
  return (
    <div ref={ref}>
      <Link className="h5-site-card" to={`/h5/${cid}/sites/${site.id}`}>
        <div className="h5-site-cover">
          {site.coverImage ? <img src={site.coverImage} alt="" loading="lazy" /> : <Icon name="map" size={25} />}
        </div>
        <div className="h5-site-copy">
          <strong>{site.name}</strong>
          <small>{[site.city, site.district, site.address].filter(Boolean).join(' ') || '园区资料待完善'}</small>
          <small>
            {q.isError
              ? '统计暂不可用'
              : s
                ? `在线 ${s.onlineKnown ? `${s.onlineCount} / ${s.deviceCount}` : '状态未知'}`
                : '正在加载设备统计'}
          </small>
          <ProgressBar percent={percent} style={{ '--track-width': '4px' }} />
        </div>
        <span className="h5-chevron" aria-hidden="true">
          ›
        </span>
      </Link>
    </div>
  )
}
