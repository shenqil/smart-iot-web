import { appSiteSummaryQuery } from '@shared/api/device'
import type { SiteView } from '@shared/api/site'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useCompanyId } from '@/hooks/session'
import { useInView } from '@/hooks/useInView'
import { Icon } from './Icon'
export function SitePreview({ site }: { site: SiteView }) {
  const cid = useCompanyId(),
    { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '120px', triggerOnce: true })
  const q = useQuery({ ...appSiteSummaryQuery(cid, site.id), enabled: inView }),
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
          <small>{q.isError ? '统计暂不可用' : s ? `设备 ${s.deviceCount} 台` : '正在加载设备统计'}</small>
        </div>
        <span className="h5-chevron" aria-hidden="true">
          ›
        </span>
      </Link>
    </div>
  )
}
