import { useDeviceTypes } from '@shared/api/dict'
import { appSitesQuery } from '@shared/api/site'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Button, InfiniteScroll, SearchBar } from 'antd-mobile'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useCompanyId, useMe } from '@/hooks/session'
import { listDevices } from '../api'
import { DeviceBookmarkCard, DeviceListItem } from '../deviceCards'
import { positiveId, readDeviceFilters } from '../filters'
import { preferenceKey, useMobilePreferences } from '../preferences'
import { Choice, Empty, Failure, Icon, Loading, Page, Sheet } from '../ui'
import DevicePage from './DevicePage'
export default function DevicesPage() {
  const [params] = useSearchParams()
  const id = positiveId(params.get('deviceId'))
  return id ? <DevicePage key={id} id={id} /> : <DeviceList />
}
function DeviceList() {
  const cid = useCompanyId(),
    me = useMe(),
    [params, setParams] = useSearchParams(),
    filters = readDeviceFilters(params),
    mode = params.get('mode'),
    goal = params.get('goal')
  const [search, setSearch] = useState(params.get('keyword') ?? ''),
    [open, setOpen] = useState(false)
  const types = useDeviceTypes(),
    sites = useQuery(appSitesQuery(cid)),
    entry = useMobilePreferences((s) => s.entries[preferenceKey(me.id, cid)])
  const [shown, setShown] = useState(20),
    bookmarks = (mode === 'favorites' ? entry?.favorites : entry?.recent) ?? [],
    isBookmarks = ['favorites', 'recent'].includes(mode ?? '')
  const query = useInfiniteQuery({
    queryKey: ['app', cid, 'devices', 'mobile-list', filters],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => listDevices(cid, { ...filters, page: pageParam, pageSize: 20 }, signal),
    getNextPageParam: (last) => (last.page * last.pageSize < last.totalCount ? last.page + 1 : undefined),
    enabled: !isBookmarks,
  })
  const keyword = params.get('keyword') ?? ''
  useEffect(() => {
    setSearch(keyword)
  }, [keyword])
  useEffect(() => {
    if (search === keyword) return
    const timer = setTimeout(() => {
      setParams(
        (old) => {
          const p = new URLSearchParams(old)
          if (search.trim()) p.set('keyword', search.trim())
          else p.delete('keyword')
          return p
        },
        { replace: true },
      )
    }, 400)
    return () => clearTimeout(timer)
  }, [search, keyword, setParams])
  const setFilter = (key: string, value: string) =>
    setParams((old) => {
      const p = new URLSearchParams(old)
      if (value) p.set(key, value)
      else p.delete(key)
      if (key === 'deviceTypeId') p.delete('unclassified')
      if (key === 'unclassified') p.delete('deviceTypeId')
      return p
    })
  const devices = [...new Map((query.data?.pages.flatMap((p) => p.records) ?? []).map((d) => [d.id, d])).values()]
  const base = `/h5/${cid}`,
    bookmarksFiltered = bookmarks.filter((d) => d.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  return (
    <Page
      title={
        mode === 'favorites'
          ? '我的关注'
          : mode === 'recent'
            ? '最近访问'
            : filters.siteId
              ? (sites.data?.find((s) => s.id === filters.siteId)?.name ?? '园区设备')
              : '全部设备'
      }
      back={isBookmarks}
      right={
        !isBookmarks && (
          <Button fill="none" onClick={() => setOpen(true)} aria-label="筛选设备">
            <Icon name="filter" />
          </Button>
        )
      }
    >
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={isBookmarks ? '搜索已保存的设备名称' : '搜索名称、设备 SN'}
      />
      {isBookmarks ? (
        <>
          <p className="h5-muted">
            {mode === 'favorites' ? '本账号在当前企业的关注设备' : '本账号在当前企业最近访问的设备'}
          </p>
          {bookmarksFiltered.length ? (
            <div className="h5-grid-two">
              {bookmarksFiltered.slice(0, shown).map((d) => (
                <div key={d.id}>
                  <DeviceBookmarkCard bookmark={d} />
                  {mode === 'favorites' && (
                    <Button
                      size="mini"
                      fill="none"
                      onClick={() => useMobilePreferences.getState().toggle(me.id, cid, d)}
                    >
                      移除关注
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty title="暂无设备">
              <Link to={`${base}/devices`}>去查看设备</Link>
            </Empty>
          )}
          {shown < bookmarksFiltered.length && (
            <Button block onClick={() => setShown((v) => v + 20)}>
              加载更多
            </Button>
          )}
        </>
      ) : (
        <>
          <div className="h5-filter-summary">
            <span>
              {filters.deviceTypeId ? types.nameOf(filters.deviceTypeId) : '全部类型'}
              {filters.unclassified ? ' · 未分类' : ''}
              {filters.online ? ` · ${filters.online === 'true' ? '在线' : '离线'}` : ''}
              {filters.capability ? ` · ${{ sensor: '采集', relay: '控制', camera: '视频' }[filters.capability]}` : ''}
              {filters.hasAlarm ? ' · 有告警' : ''}
            </span>
            <Button size="mini" fill="none" onClick={() => setParams(goal ? { goal, capability: 'sensor' } : {})}>
              清除筛选
            </Button>
          </div>
          {query.isPending ? (
            <Loading />
          ) : query.isError && !devices.length ? (
            <Failure
              error={query.error}
              retry={() => {
                void query.refetch()
              }}
            />
          ) : devices.length ? (
            devices.map((d) => (
              <DeviceListItem
                key={d.id}
                device={d}
                typeName={types.nameOf(d.deviceTypeId)}
                to={`${base}/devices?deviceId=${d.id}${filters.siteId ? `&siteId=${filters.siteId}` : ''}${goal === 'history' && d.sensors.length ? '&tab=history' : ''}`}
                favorite={!!entry?.favorites.some((f) => f.id === d.id)}
                onFavorite={() =>
                  useMobilePreferences.getState().toggle(me.id, cid, { id: d.id, name: d.name, siteId: filters.siteId })
                }
              />
            ))
          ) : (
            <Empty title="当前条件下暂无设备" />
          )}
          {query.isError && !!devices.length && (
            <Failure
              error={query.error}
              retry={() => {
                void query.refetch()
              }}
            />
          )}
          <InfiniteScroll
            hasMore={!!query.hasNextPage && !query.isError}
            loadMore={async () => {
              await query.fetchNextPage()
            }}
          />
        </>
      )}
      <Sheet
        title="设备范围与筛选"
        visible={open}
        close={() => setOpen(false)}
        footer={
          <Button block color="primary" onClick={() => setOpen(false)}>
            查看筛选结果
          </Button>
        }
      >
        <Choice
          label="园区"
          value={filters.siteId ? String(filters.siteId) : ''}
          options={[
            { label: '全部园区', value: '' },
            ...(sites.data ?? []).map((s) => ({ label: s.name, value: String(s.id) })),
          ]}
          onChange={(v) => setFilter('siteId', v)}
        />
        <Choice
          label="类型"
          value={filters.unclassified ? 'none' : filters.deviceTypeId ? String(filters.deviceTypeId) : ''}
          options={[
            { label: '全部类型', value: '' },
            { label: '未分类', value: 'none' },
            ...types.list.map((t) => ({ label: t.name, value: String(t.id) })),
          ]}
          onChange={(v) => (v === 'none' ? setFilter('unclassified', 'true') : setFilter('deviceTypeId', v))}
        />
        <Choice
          label="在线状态"
          value={filters.online}
          options={[
            { label: '全部', value: '' },
            { label: '在线', value: 'true' },
            { label: '离线', value: 'false' },
          ]}
          onChange={(v) => setFilter('online', v)}
        />
        <Choice
          label="业务能力"
          value={filters.capability}
          options={[
            { label: '全部', value: '' },
            { label: '数据采集', value: 'sensor' },
            { label: '远程控制', value: 'relay' },
            { label: '视频监控', value: 'camera' },
          ]}
          onChange={(v) => setFilter('capability', v)}
        />
        <Choice
          label="告警"
          value={filters.hasAlarm ? 'true' : ''}
          options={[
            { label: '全部', value: '' },
            { label: '有未处理告警', value: 'true' },
          ]}
          onChange={(v) => setFilter('hasAlarm', v)}
        />
      </Sheet>
    </Page>
  )
}
