import { queryClient } from '@shared/queryClient'
import { PullToRefresh } from 'antd-mobile'
import { useCompanyId } from '@/hooks/session'
import { Page } from '../ui'
import { AlarmPreviewSection } from './home/AlarmPreviewSection'
import { DistributionSection } from './home/DistributionSection'
import { FavoritesSection } from './home/FavoritesSection'
import { OverviewSection } from './home/OverviewSection'
import { RecentSection } from './home/RecentSection'
import { SitesSection } from './home/SitesSection'

export default function HomePage() {
  const cid = useCompanyId()
  return (
    <Page header={false} title="首页">
      <PullToRefresh
        onRefresh={async () => {
          await queryClient.invalidateQueries({ queryKey: ['app', cid] })
        }}
      >
        <div className="h5-home-stack">
          <OverviewSection />
          <DistributionSection />
          <AlarmPreviewSection />
          <FavoritesSection />
          <SitesSection />
          <RecentSection />
        </div>
      </PullToRefresh>
    </Page>
  )
}
