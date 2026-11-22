import { SearchOutlined, StarFilled, StarOutlined } from '@ant-design/icons'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Empty, Input, Spin, Tooltip, Tree, type TreeDataNode } from 'antd'
import { useState } from 'react'
import { formatUnprocessedCount, unprocessedAlarmCountsQuery } from '@/features/alarm/api'
import { type AppDevice, appSiteDevicesQuery } from '@/features/device/api'
import { useDeviceTypes } from '@/features/dict/api'
import { appSitesQuery } from '@/features/site/api'
import { isVideoDeviceType } from '@/features/telemetry/lib/realtime'
import { useCompanyId } from '@/hooks/session'
import { usePref } from '@/stores/pref'
import { useScope } from './useScope'

const SITE_STATUS: Record<string, string> = { inactive: '停用', under_construction: '建设中' }
const FAV_KEY = 'fav'

function OnlineDot({ online }: { online: boolean | undefined }) {
  return (
    <span
      title={online ? '在线' : online === false ? '离线' : '未加载'}
      className={`inline-block size-2 shrink-0 rounded-full ${online ? 'bg-success' : 'border border-fg-tertiary border-solid bg-transparent'}`}
    />
  )
}

/** 未处理告警数角标 (红底白字)；"…" 表示超过一次能统计的数量 */
function AlarmBadge({ count }: { count: number | string }) {
  return (
    <span
      className="shrink-0 rounded-full bg-danger px-1.5 text-[11px] text-white leading-4 tabular-nums"
      title="未处理告警"
    >
      {count}
    </span>
  )
}

/**
 * 园区设备树：数据端的范围选择器 (FRONTEND_DESIGN §5.1)
 * - 园区 / 设备两层；搜索 (已加载的设备)
 * - 未处理告警数：unprocessed-counts 一次返回各园区及设备的条数。每台设备最多 100，园区数是这些设备之和；超过 99 显示 99+
 * - 我的关注：星标设备置顶 (本机保存)
 */
export function ScopeTree() {
  const companyId = useCompanyId()
  const types = useDeviceTypes()
  const { siteId, deviceId, select } = useScope()
  const [expanded, setExpanded] = useState<number[]>(() => (siteId ? [siteId] : []))
  const [favOpen, setFavOpen] = useState(true)
  const [keyword, setKeyword] = useState('')
  const favorites = usePref((s) => s.favorites[companyId]) ?? []
  const toggleFavorite = usePref((s) => s.toggleFavorite)

  const sites = useQuery(appSitesQuery(companyId))
  const siteList = sites.data ?? []
  const alarmCounts = useQuery(unprocessedAlarmCountsQuery(companyId))
  const siteAlarm = new Map<number, { count: number; capped: boolean }>()
  const deviceAlarm = new Map<number, number>()
  for (const site of alarmCounts.data?.sites ?? []) {
    siteAlarm.set(site.siteId, { count: site.count, capped: false })
    for (const device of site.devices) deviceAlarm.set(device.deviceId, device.count)
  }

  // 已展开的园区 + 关注设备所在园区：加载设备列表
  const loadIds = [...new Set([...expanded, ...favorites.map((f) => f.siteId)])]
  const deviceQueries = useQueries({ queries: loadIds.map((id) => appSiteDevicesQuery(companyId, id)) })
  const devicesBySite = new Map<number, AppDevice[] | undefined>(loadIds.map((id, i) => [id, deviceQueries[i].data]))

  const kw = keyword.trim().toLowerCase()
  const match = (d: AppDevice) => !kw || d.name.toLowerCase().includes(kw) || d.deviceSn.toLowerCase().includes(kw)

  const isFav = (sid: number, did: number) => favorites.some((f) => f.siteId === sid && f.deviceId === did)
  const star = (sid: number, d: { id: number; name: string }) => {
    const on = isFav(sid, d.id)
    return (
      <Tooltip title={on ? '取消关注' : '关注'}>
        <button
          type="button"
          aria-label={on ? '取消关注' : '关注'}
          data-on={on}
          className={`star-btn ml-1 flex shrink-0 cursor-pointer border-0 bg-transparent p-0 ${on ? 'text-warning' : 'text-fg-tertiary'}`}
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(companyId, { siteId: sid, deviceId: d.id, name: d.name })
          }}
        >
          {on ? <StarFilled /> : <StarOutlined />}
        </button>
      </Tooltip>
    )
  }

  const deviceTitle = (sid: number, d: AppDevice) => {
    const isVideo = isVideoDeviceType(types.nameOf(d.deviceTypeId))
    const isOnline = d.online
    const n = deviceAlarm.get(d.id) ?? 0
    return (
      <span className="group flex items-center gap-2">
        <OnlineDot online={isOnline} />
        <span className="truncate">{d.name}</span>
        <span className="ml-auto flex items-center">
          {!isVideo && n > 0 && <AlarmBadge count={formatUnprocessedCount({ count: n, capped: false })} />}
          {star(sid, d)}
        </span>
      </span>
    )
  }

  const siteNodes: TreeDataNode[] = siteList.flatMap((s) => {
    const all = devicesBySite.get(s.id)
    const alarm = siteAlarm.get(s.id)
    const devices = (all ?? []).filter(match)
    if (kw && all && !devices.length && !s.name.toLowerCase().includes(kw)) return []
    const online = (all ?? []).filter((d) => d.online).length
    return [
      {
        key: `s:${s.id}`,
        isLeaf: false,
        title: (
          <span className={`flex items-center gap-2 ${s.status !== 'active' ? 'text-fg-tertiary' : ''}`}>
            <span className="truncate">{s.name}</span>
            {SITE_STATUS[s.status] && <span className="shrink-0 text-xs">({SITE_STATUS[s.status]})</span>}
            <span className="ml-auto flex shrink-0 items-center gap-1.5 pr-1">
              {alarm && alarm.count > 0 && <AlarmBadge count={formatUnprocessedCount(alarm)} />}
              {all && (
                <span className="text-fg-tertiary text-xs">
                  {online}/{all.length}
                </span>
              )}
            </span>
          </span>
        ),
        children: all
          ? devices.length
            ? devices.map((d) => ({ key: `d:${s.id}:${d.id}`, isLeaf: true, title: deviceTitle(s.id, d) }))
            : [
                {
                  key: `none:${s.id}`,
                  isLeaf: true,
                  selectable: false,
                  title: <span className="text-fg-tertiary text-xs">没有符合条件的设备</span>,
                },
              ]
          : [{ key: `loading:${s.id}`, isLeaf: true, selectable: false, title: <Spin size="small" /> }],
      },
    ]
  })

  const favNodes: TreeDataNode[] = favorites
    .map((f) => ({ f, d: devicesBySite.get(f.siteId)?.find((x) => x.id === f.deviceId) }))
    .filter(({ d }) => !d || match(d))
    .map(({ f, d }) => ({
      key: `f:${f.siteId}:${f.deviceId}`,
      isLeaf: true,
      title: d ? (
        deviceTitle(f.siteId, d)
      ) : (
        <span className="flex items-center gap-2">
          <OnlineDot online={undefined} />
          <span className="truncate">{f.name}</span>
          <span className="ml-auto">{star(f.siteId, { id: f.deviceId, name: f.name })}</span>
        </span>
      ),
    }))

  const treeData: TreeDataNode[] = [
    ...(favorites.length
      ? [
          {
            key: FAV_KEY,
            isLeaf: false,
            selectable: false,
            title: (
              <span className="flex items-center gap-2 text-fg-secondary">
                <StarFilled className="text-warning" />
                我的关注
              </span>
            ),
            children: favNodes.length
              ? favNodes
              : [
                  {
                    key: 'fav:none',
                    isLeaf: true,
                    selectable: false,
                    title: <span className="text-fg-tertiary text-xs">没有符合条件的设备</span>,
                  },
                ],
          },
        ]
      : []),
    ...siteNodes,
  ]

  const selectedKeys =
    deviceId && siteId ? [`d:${siteId}:${deviceId}`, `f:${siteId}:${deviceId}`] : siteId ? [`s:${siteId}`] : []
  const expandedKeys = [...(favOpen && favorites.length ? [FAV_KEY] : []), ...expanded.map((id) => `s:${id}`)]

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <Input
        allowClear
        prefix={<SearchOutlined className="text-fg-tertiary" />}
        placeholder="搜索设备名称 / SN"
        value={keyword}
        onChange={(e) => {
          setKeyword(e.target.value)
          // 搜索时展开全部园区，以便在所有设备中匹配
          if (e.target.value.trim()) setExpanded(siteList.map((s) => s.id))
        }}
      />
      <div className="scope-tree min-h-0 flex-1 overflow-auto">
        {sites.isPending ? (
          <div className="py-8 text-center">
            <Spin />
          </div>
        ) : treeData.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={siteList.length ? '没有符合条件的园区' : '暂无园区'}
          />
        ) : (
          <Tree
            blockNode
            treeData={treeData}
            expandedKeys={expandedKeys}
            selectedKeys={selectedKeys}
            onExpand={(keys) => {
              const ks = keys.map(String)
              setFavOpen(ks.includes(FAV_KEY))
              setExpanded(ks.filter((k) => k.startsWith('s:')).map((k) => Number(k.slice(2))))
            }}
            onSelect={(_, { node }) => {
              const [type, a, b] = String(node.key).split(':')
              if (type === 's') {
                select({ siteId: Number(a) })
                if (!expanded.includes(Number(a))) setExpanded([...expanded, Number(a)])
              } else if (type === 'd' || type === 'f') {
                select({ siteId: Number(a), deviceId: Number(b) })
              }
            }}
          />
        )}
      </div>
    </div>
  )
}
