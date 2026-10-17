import { SearchOutlined } from '@ant-design/icons'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Empty, Input, Segmented, Spin, Tree, type TreeDataNode } from 'antd'
import { useState } from 'react'
import { type AppDevice, appSiteDevicesQuery } from '@/features/device/api'
import { appSitesQuery } from '@/features/site/api'
import { useCompanyId } from '@/hooks/session'
import { useScope } from './useScope'

type Filter = 'all' | 'online' | 'offline'

const SITE_STATUS: Record<string, string> = { inactive: '停用', under_construction: '建设中' }

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span
      title={online ? '在线' : '离线'}
      className={`inline-block size-2 shrink-0 rounded-full ${online ? 'bg-success' : 'border border-fg-tertiary border-solid bg-transparent'}`}
    />
  )
}

/**
 * 园区设备树：数据端的范围选择器 (FRONTEND_DESIGN §5.1)
 * M0：园区 / 设备两层、搜索、在线筛选；M4 补充告警数、关注、虚拟滚动与按类型分组
 */
export function ScopeTree() {
  const companyId = useCompanyId()
  const { siteId, deviceId, select } = useScope()
  const [expanded, setExpanded] = useState<number[]>(() => (siteId ? [siteId] : []))
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const sites = useQuery(appSitesQuery(companyId))
  const deviceQueries = useQueries({
    queries: expanded.map((id) => ({ ...appSiteDevicesQuery(companyId, id) })),
  })
  const devicesBySite = new Map<number, AppDevice[] | undefined>(expanded.map((id, i) => [id, deviceQueries[i].data]))

  const kw = keyword.trim().toLowerCase()
  const treeData: TreeDataNode[] = (sites.data ?? []).map((s) => {
    const all = devicesBySite.get(s.id)
    const devices = (all ?? []).filter(
      (d) =>
        (filter === 'all' || (filter === 'online' ? d.online : !d.online)) &&
        (!kw || d.name.toLowerCase().includes(kw) || d.deviceSn.toLowerCase().includes(kw)),
    )
    const online = all?.filter((d) => d.online).length
    return {
      key: `s:${s.id}`,
      isLeaf: false,
      title: (
        <span className={`flex items-center gap-2 ${s.status !== 'active' ? 'text-fg-tertiary' : ''}`}>
          <span className="truncate">{s.name}</span>
          {SITE_STATUS[s.status] && <span className="text-xs">({SITE_STATUS[s.status]})</span>}
          {all && (
            <span className="ml-auto pr-1 text-fg-tertiary text-xs">
              {online}/{all.length}
            </span>
          )}
        </span>
      ),
      children: all
        ? devices.map((d) => ({
            key: `d:${s.id}:${d.id}`,
            isLeaf: true,
            title: (
              <span className="flex items-center gap-2">
                <OnlineDot online={d.online} />
                <span className="truncate">{d.name}</span>
              </span>
            ),
          }))
        : [{ key: `loading:${s.id}`, isLeaf: true, selectable: false, title: <Spin size="small" /> }],
    }
  })

  const selectedKey = deviceId && siteId ? `d:${siteId}:${deviceId}` : siteId ? `s:${siteId}` : null

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <Input
        allowClear
        prefix={<SearchOutlined className="text-fg-tertiary" />}
        placeholder="搜索设备名称 / SN"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      <Segmented<Filter>
        block
        size="small"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: '全部' },
          { value: 'online', label: '在线' },
          { value: 'offline', label: '离线' },
        ]}
      />
      <div className="min-h-0 flex-1 overflow-auto">
        {sites.isPending ? (
          <div className="py-8 text-center">
            <Spin />
          </div>
        ) : treeData.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无园区" />
        ) : (
          <Tree
            blockNode
            treeData={treeData}
            expandedKeys={expanded.map((id) => `s:${id}`)}
            selectedKeys={selectedKey ? [selectedKey] : []}
            onExpand={(keys) => setExpanded(keys.map((k) => Number(String(k).slice(2))))}
            onSelect={(_, { node }) => {
              const [type, a, b] = String(node.key).split(':')
              if (type === 's') {
                select({ siteId: Number(a) })
                if (!expanded.includes(Number(a))) setExpanded([...expanded, Number(a)])
              } else if (type === 'd') {
                select({ siteId: Number(a), deviceId: Number(b) })
              }
            }}
          />
        )}
      </div>
    </div>
  )
}
