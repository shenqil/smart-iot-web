import { useQuery } from '@tanstack/react-query'
import { Button, SearchBar } from 'antd-mobile'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { type OperationQuery, operationsQuery } from '@/features/relay/api'
import { appSitesQuery } from '@/features/site/api'
import { opDisplayStatus } from '@/features/telemetry/lib/realtime'
import { useCompanyId } from '@/hooks/session'
import { fmtDateTime } from '@/lib/time'
import { TimeFilter } from './AlarmsPage'
import { positiveId } from './filters'
import { Card, Choice, Empty, Failure, Icon, Loading, Page, Sheet } from './ui'

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
    [params, setParams] = useSearchParams(),
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
    patch = useCallback(
      (values: Record<string, string>) =>
        setParams((old) => {
          const p = new URLSearchParams(old)
          p.delete('page')
          for (const [k, v] of Object.entries(values))
            if (v) p.set(k, v)
            else p.delete(k)
          return p
        }),
      [setParams],
    )
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
      <p className="h5-notice">包含其他企业成员对同一设备的操作；记录仅保留当月与上月。</p>
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
          <Card key={r.id}>
            <div className="h5-tags">
              <span className="h5-chip">{SOURCES[r.source] ?? r.source}</span>
              <span className={opDisplayStatus(r) === 'success' ? 'h5-online' : 'h5-warning'}>
                {STATUS[opDisplayStatus(r)] ?? r.status}
              </span>
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
      <div className="h5-pagination">
        <Button
          size="small"
          disabled={page <= 1 || query.isFetching}
          onClick={() =>
            setParams((old) => {
              const p = new URLSearchParams(old)
              p.set('page', String(page - 1))
              return p
            })
          }
        >
          上一页
        </Button>
        <span>第 {page} 页</span>
        <Button
          size="small"
          disabled={!query.data?.hasMore || query.isFetching}
          onClick={() =>
            setParams((old) => {
              const p = new URLSearchParams(old)
              p.set('page', String(page + 1))
              return p
            })
          }
        >
          下一页
        </Button>
      </div>
      <Sheet title="记录筛选" visible={open} close={() => setOpen(false)}>
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
        <Button block color="primary" onClick={() => setOpen(false)}>
          完成
        </Button>
      </Sheet>
    </Page>
  )
}
