import { useQuery } from '@tanstack/react-query'
import { api, companyHeader, unwrap } from '@/api/client'
import { useCompanyId } from '@/hooks/session'
import type { Rect } from './layout'
import { Panel, PanelEmpty, PanelError } from './Panel'

const NODE_LABELS: Record<string, string> = { server: 'Server', core: 'Core', gateway: 'Gateway' }

export function NodeUsageCard({ metric, rect }: { metric: 'cpu' | 'memory'; rect: Rect }) {
  const companyId = useCompanyId()
  const usage = useQuery({
    queryKey: ['app', companyId, 'node-usage'],
    queryFn: ({ signal }) =>
      unwrap(api.GET('/api/v1/app/node-usage', { signal, params: { header: companyHeader(companyId) } })),
    refetchInterval: 30_000,
    staleTime: 25_000,
    meta: { silent: true },
  })
  const title = metric === 'cpu' ? '节点 CPU 使用率' : '节点内存使用率'
  const field = metric === 'cpu' ? 'cpuPercent' : 'memoryPercent'

  return (
    <Panel title={title} rect={rect}>
      {usage.isError && !usage.data ? (
        <PanelError onRetry={() => usage.refetch()} />
      ) : usage.isPending ? (
        <PanelEmpty>正在加载…</PanelEmpty>
      ) : !usage.data?.some((row) => row[field] != null) ? (
        <PanelEmpty>暂无节点使用率数据</PanelEmpty>
      ) : (
        <div className="screen-scroll grid content-start gap-2">
          {usage.data.map((row) => {
            const value = row[field]
            return (
              <div
                key={row.node}
                className="rounded border border-[rgb(148_163_184/0.14)] border-solid bg-[rgb(148_163_184/0.07)] px-3 py-2.5"
              >
                <div className="flex items-center justify-between text-[13px]">
                  <span>{NODE_LABELS[row.node] ?? row.node}</span>
                  <span className="screen-num text-[#67e8f9]">{value == null ? '—' : `${value.toFixed(1)}%`}</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[rgb(148_163_184/0.18)]" aria-hidden="true">
                  <div
                    className="h-full bg-[#22d3ee]"
                    style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
