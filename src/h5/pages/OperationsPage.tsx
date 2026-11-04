import { type OperationQuery, operationsQuery } from '@shared/api/relay'
import { appSitesQuery } from '@shared/api/site'
import { opDisplayStatus } from '@shared/telemetry/lib/realtime'
import { useQuery } from '@tanstack/react-query'
import { Button, SearchBar } from 'antd-mobile'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useCompanyId } from '@/hooks/session'
import { useNow } from '@/hooks/useNow'
import { fmtDateTime } from '@/lib/time'
import { TimeFilter } from '../components/TimeRangeFilter'
import { positiveId } from '../filters'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { Card, Choice, Empty, Failure, Icon, Loading, Notice, Page, Pagination, Sheet, StatusTag } from '../ui'

const SOURCES: Record<string, string> = {
  manual: '手动',
  linkage: '联动',
  schedule: '定时',
  hold: '接管',
  release: '恢复自动',
}
const STATUS: Record<string, string> = { pending: '执行中', success: '成功', failed: '失败', timeout: '未应答' }
export default function OperationsPage() {
  const cid = useCompanyId(),
    { params, patch, goPage } = useUrlFilters(),
    [open, setOpen] = useState(false),
    [search, setSearch] = useState(params.get('keyword') ?? ''),
    sites = useQuery(appSitesQuery(cid)),
    page = positiveId(params.get('page')) ?? 1
  const source = params.get('source'),
    status = params.get('status'),
    keyword = params.get('keyword') ?? ''
  const q: OperationQuery = {
    page,
    pageSize: 20,
    siteId: positiveId(params.get('siteId')),
    deviceId: positiveId(params.get('deviceId')),
    source: source && source in SOURCES ? (source as OperationQuery['source']) : undefined,
    status: status && status in STATUS ? (status as OperationQuery['status']) : undefined,
    keyword: keyword || undefined,
    start: params.get('start') || undefined,
    end: params.get('end') || undefined,
    sort: '-createdAt',
  }
  const query = useQuery(operationsQuery(cid, q)),
    now = useNow(10_000)
  useEffect(() => {
    setSearch(keyword)
  }, [keyword])
  useEffect(() => {
    if (keyword === search) return
    const t = setTimeout(() => patch({ keyword: search.trim() }), 500)
    return () => clearTimeout(t)
  }, [keyword, search, patch])
  return (
    <Page
      title="操作记录"
      right={
        <Button fill="none" onClick={() => setOpen(true)} aria-label="筛选记录">
          <Icon name="filter" />
        </Button>
      }
    >
      <Notice>同一设备的操作记录在授权范围内共享 · 保留当月与上月</Notice>
      <SearchBar placeholder="设备 SN、操作人" value={search} onChange={setSearch} />
      {query.isPending || query.isPlaceholderData ? (
        <Loading />
      ) : query.isError ? (
        <Failure
          error={query.error}
          retry={() => {
            void query.refetch()
          }}
        />
      ) : !query.data?.records.length ? (
        <Empty title="暂无操作记录" />
      ) : (
        query.data.records.map((r) => (
          <Card key={r.id} className="h5-record-card">
            <div className="h5-tags">
              <span className="h5-chip">{SOURCES[r.source] ?? r.source}</span>
              <StatusTag
                tone={
                  opDisplayStatus(r, now) === 'success'
                    ? 'success'
                    : opDisplayStatus(r, now) === 'failed'
                      ? 'danger'
                      : 'warning'
                }
              >
                {STATUS[opDisplayStatus(r, now)] ?? r.status}
              </StatusTag>
            </div>
            <h2>
              {r.source === 'hold'
                ? '进入手动接管'
                : r.source === 'release'
                  ? '恢复自动'
                  : r.targetState === 1
                    ? '开启'
                    : '关闭'}{' '}
              · 通道 {r.channel}
            </h2>
            <p>
              {r.operatorName || '自动任务'} · {fmtDateTime(r.createdAt)}
            </p>
            <p className="h5-muted">SN {r.deviceSn}</p>
            {r.source === 'hold' || r.source === 'release' ? (
              <p className="h5-muted">此记录为控制模式变更，不表示下发了开关命令。</p>
            ) : (
              <p>设备回报：{r.actualState == null ? '尚未确认' : r.actualState ? '开启' : '关闭'}</p>
            )}
            {r.errorMessage && <p className="h5-warning">{r.errorMessage}</p>}
            <Link to={`/h5/${cid}/devices?deviceId=${r.deviceId}`}>关联设备 ›</Link>
          </Card>
        ))
      )}
      <Pagination
        page={page}
        hasMore={!!query.data?.hasMore && !query.isError && !query.isPlaceholderData}
        busy={query.isFetching}
        onChange={goPage}
      />
      <Sheet
        title="记录筛选"
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
          value={q.siteId ? String(q.siteId) : ''}
          options={[
            { label: '全部园区', value: '' },
            ...(sites.data ?? []).map((s) => ({ label: s.name, value: String(s.id) })),
          ]}
          onChange={(v) => patch({ siteId: v, deviceId: '' })}
        />
        {q.deviceId && <Button onClick={() => patch({ deviceId: '' })}>清除设备范围 #{q.deviceId}</Button>}
        <Choice
          label="来源"
          value={q.source}
          options={[
            { label: '全部', value: '' },
            ...Object.entries(SOURCES).map(([value, label]) => ({ value, label })),
          ]}
          onChange={(v) => patch({ source: v })}
        />
        <Choice
          label="结果"
          value={q.status}
          options={[
            { label: '全部', value: '' },
            ...Object.entries(STATUS).map(([value, label]) => ({ value, label })),
          ]}
          onChange={(v) => patch({ status: v })}
        />
        <TimeFilter start={q.start} end={q.end} apply={(start, end) => patch({ start, end })} />
      </Sheet>
    </Page>
  )
}
