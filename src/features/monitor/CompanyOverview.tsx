import { EnvironmentOutlined } from '@ant-design/icons'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Card, Empty, Skeleton } from 'antd'
import { EnumTag, SITE_STATUS } from '@/components/StatusTag'
import { scopedUnprocessedCountQuery } from '@/features/alarm/api'
import { appSiteDevicesQuery } from '@/features/device/api'
import { appSitesQuery } from '@/features/site/api'
import { useCompanyId } from '@/hooks/session'
import { useScope } from '@/layouts/app/useScope'

/** 企业总览 (简版)：园区卡片 + 未处理告警数，点卡片选中园区 */
export function CompanyOverview() {
  const companyId = useCompanyId()
  const { select } = useScope()
  const sites = useQuery(appSitesQuery(companyId))
  const list = sites.data ?? []
  const counts = useQueries({
    queries: list.map((s) => scopedUnprocessedCountQuery(companyId, { siteId: s.id })),
  })
  // 在线率：前 20 个园区加载设备列表 (与设备树共用缓存)
  const deviceLists = useQueries({
    queries: list.slice(0, 20).map((s) => appSiteDevicesQuery(companyId, s.id)),
  })

  return (
    <Card variant="borderless" title="园区" extra={<span className="text-fg-tertiary text-sm">选择园区查看设备</span>}>
      {sites.isPending ? (
        <Skeleton active />
      ) : list.length === 0 ? (
        <Empty description="还没有可查看的园区，请联系企业管理员创建园区并挂载设备" />
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {list.map((s, i) => {
            const c = counts[i]?.data
            const devices = deviceLists[i]?.data
            const online = devices?.filter((d) => d.online).length ?? 0
            const address = [s.city, s.district, s.address].filter(Boolean).join(' ')
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => select({ siteId: s.id })}
                className="cursor-pointer overflow-hidden rounded-lg border border-line border-solid bg-container p-0 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
              >
                <div className="relative flex h-28 items-center justify-center bg-primary-bg">
                  {s.coverImage ? (
                    <img src={s.coverImage} alt="" className="size-full object-cover" />
                  ) : (
                    <EnvironmentOutlined className="text-4xl text-primary opacity-25" />
                  )}
                  {c && c.count > 0 && (
                    <span className="absolute top-2 right-2 rounded-full bg-danger px-2 py-0.5 text-white text-xs">
                      ⚠ {c.capped ? '999+' : c.count} 条未处理告警
                    </span>
                  )}
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-base text-fg">{s.name}</span>
                    {s.status !== 'active' && <EnumTag value={s.status} defs={SITE_STATUS} />}
                  </div>
                  <div className="mt-1 truncate text-fg-tertiary text-xs">
                    <EnvironmentOutlined className="mr-1" />
                    {address || '未填写地址'}
                  </div>
                  {devices && (
                    <div className="mt-3 flex items-center gap-3 text-xs">
                      <span className="text-fg-secondary">
                        在线 <b className="text-fg tabular-nums">{online}</b> / {devices.length}
                      </span>
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                        <span
                          className="block h-full rounded-full bg-success"
                          style={{ width: `${devices.length ? (online / devices.length) * 100 : 0}%` }}
                        />
                      </span>
                      <span className="text-fg-tertiary tabular-nums">
                        {devices.length ? Math.round((online / devices.length) * 100) : 0}%
                      </span>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}
