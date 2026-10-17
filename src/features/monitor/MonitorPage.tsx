import { PagePlaceholder } from '@/components/PagePlaceholder'
import { ScopeHeader } from '@/layouts/app/ScopeHeader'
import { useScope } from '@/layouts/app/useScope'

/** 监测：按设备树选中项显示企业总览 / 园区总览 / 设备工作区 (M4) */
export default function MonitorPage() {
  const { siteId, deviceId } = useScope()
  return (
    <>
      <ScopeHeader />
      {deviceId ? (
        <PagePlaceholder
          title="设备工作区"
          milestone="M4"
          items={[
            '实时：传感器卡片 (5s 轮询、迷你曲线、超量程提示) + 继电器开关 (同步等待结果，不重发)',
            '历史曲线：≤31 天、Web Worker 解析与 LTTB 降采样、导出 CSV',
            '日 / 月环比、该设备的告警与操作记录',
          ]}
        />
      ) : siteId ? (
        <PagePlaceholder
          title="园区总览"
          milestone="M4"
          items={['设备数 / 在线 / 离线 / 未处理告警', '天地图设备标点 + 最新告警', '设备卡片 (可视区域内加载实时值)']}
        />
      ) : (
        <PagePlaceholder
          title="企业总览"
          milestone="M4"
          items={['园区卡片：在线率、未处理告警数，点击选中园区', '在左侧园区设备树中选择园区或设备查看详情']}
        />
      )}
    </>
  )
}
