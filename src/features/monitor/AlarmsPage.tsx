import { PagePlaceholder } from '@/components/PagePlaceholder'
import { ScopeHeader, useScopeLabel } from '@/layouts/app/ScopeHeader'

export default function AlarmsPage() {
  const scope = useScopeLabel()
  return (
    <>
      <ScopeHeader />
      <PagePlaceholder
        title={`告警 (${scope}范围)`}
        milestone="M4"
        items={['按级别 / 类型 / 处理状态 / 时间 / 关键字筛选，可按次数与最后告警时间排序', '批量处理并填写备注']}
      />
    </>
  )
}
