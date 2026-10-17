import { PagePlaceholder } from '@/components/PagePlaceholder'
import { ScopeHeader, useScopeLabel } from '@/layouts/app/ScopeHeader'

export default function OperationsPage() {
  const scope = useScopeLabel()
  return (
    <>
      <ScopeHeader />
      <PagePlaceholder
        title={`继电器操作记录 (${scope}范围)`}
        milestone="M4"
        items={[
          '按状态 / 时间 / 关键字 (SN、操作人) 筛选',
          '通道号转为继电器名称，显示目标 / 实际状态、耗时与错误信息',
        ]}
      />
    </>
  )
}
