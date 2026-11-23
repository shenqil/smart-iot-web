import { appSitesQuery } from '@shared/api/site'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useCompanyId } from '@/hooks/session'
import { SitePreview } from '../../components/SiteCard'
import { Empty, Failure, Loading, SectionHeading } from '../../ui'

export function SitesSection() {
  const cid = useCompanyId(),
    base = `/h5/${cid}`
  const sites = useQuery(appSitesQuery(cid))
  return (
    <>
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
    </>
  )
}
