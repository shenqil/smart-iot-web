import { useQuery } from '@tanstack/react-query'
import { Button, Checkbox, PullToRefresh, SearchBar, TextArea } from 'antd-mobile'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { queryClient } from '@/app/queryClient'
import { type AlarmQuery, alarmDetailQuery, alarmsQuery, processAlarms } from '@/features/alarm/api'
import { appSitesQuery } from '@/features/site/api'
import { useCompanyId, useMe } from '@/hooks/session'
import { bizNow, fmtDateTime } from '@/lib/time'
import { positiveId } from './filters'
import { Card, Choice, Empty, Failure, Icon, Loading, Page, Sheet, showFailure, mobileToast as Toast } from './ui'

export const LEVELS: Record<number, string> = { 1: '紧急', 2: '重要', 3: '警告', 4: '提示' }
export const ALARM_STATES: Record<string, string> = { active: '进行中', recovered: '已解除', closed: '已关闭' }
const TYPES: Record<string, string> = {
  threshold: '越限',
  offline: '离线',
  fault: '故障',
  relay_failed: '定时开关失败',
}
export default function AlarmsPage() {
  const { alarmId } = useParams()
  return alarmId ? <AlarmDetail id={Number(alarmId)} /> : <AlarmList />
}
function AlarmList() {
  const cid = useCompanyId(),
    [params, setParams] = useSearchParams(),
    page = positiveId(params.get('page')) ?? 1,
    processed = ['true', 'all'].includes(params.get('processed') ?? '') ? (params.get('processed') ?? 'false') : 'false'
  const sites = useQuery(appSitesQuery(cid)),
    [filter, setFilter] = useState(false),
    [multi, setMulti] = useState(false),
    [selected, setSelected] = useState<number[]>([]),
    [processing, setProcessing] = useState<number[] | null>(null),
    [text, setText] = useState(params.get('keyword') ?? '')
  const keyword = params.get('keyword') ?? '',
    signature = params.toString(),
    level = Number(params.get('level')),
    type = params.get('type'),
    state = params.get('status')
  const q: AlarmQuery = {
    siteId: positiveId(params.get('siteId')),
    deviceId: positiveId(params.get('deviceId')),
    level: level >= 1 && level <= 4 ? level : undefined,
    type: type && type in TYPES ? (type as AlarmQuery['type']) : undefined,
    status: state && state in ALARM_STATES ? (state as AlarmQuery['status']) : undefined,
    processed: processed === 'all' ? undefined : (processed as 'true' | 'false'),
    keyword: keyword || undefined,
    start: params.get('start') || undefined,
    end: params.get('end') || undefined,
    page,
    pageSize: 20,
    sort: '-lastAlarmAt',
  }
  const query = useQuery(alarmsQuery(cid, q))
  useEffect(() => {
    setText(keyword)
  }, [keyword])
  // biome-ignore lint/correctness/useExhaustiveDependencies: selection belongs to the exact URL filter and page
  useEffect(() => {
    setSelected([])
    setMulti(false)
  }, [signature])
  const patch = useCallback(
    (values: Record<string, string>) =>
      setParams((old) => {
        const p = new URLSearchParams(old)
        p.delete('page')
        for (const [k, v] of Object.entries(values)) {
          if (v) p.set(k, v)
          else p.delete(k)
        }
        return p
      }),
    [setParams],
  )
  useEffect(() => {
    if (text === keyword) return
    const t = setTimeout(() => patch({ keyword: text.trim() }), 500)
    return () => clearTimeout(t)
  }, [text, keyword, patch])
  const records = query.isPlaceholderData ? [] : (query.data?.records ?? []),
    base = `/h5/${cid}`
  return (
    <Page
      title="告警"
      back={false}
      right={
        <Button fill="none" onClick={() => setFilter(true)} aria-label="筛选告警">
          <Icon name="filter" />
        </Button>
      }
      tabs={[
        { key: 'false', title: '未处理' },
        { key: 'true', title: '已处理' },
        { key: 'all', title: '全部' },
      ]}
      tab={processed}
      onTab={(v) => patch({ processed: v })}
    >
      <SearchBar placeholder="设备 SN、名称或描述" value={text} onChange={setText} />
      <div className="h5-row">
        <small className="h5-muted">
          {q.deviceId
            ? `设备 #${q.deviceId}`
            : q.siteId
              ? sites.data?.find((s) => s.id === q.siteId)?.name
              : '全部园区'}{' '}
          · 仅保留当月与上月
        </small>
        <Button
          size="small"
          fill="none"
          onClick={() => {
            setSelected([])
            setMulti((v) => !v)
          }}
          disabled={!records.some((a) => !a.processed)}
        >
          {multi ? '退出多选' : '多选处理'}
        </Button>
      </div>
      <PullToRefresh
        onRefresh={async () => {
          setSelected([])
          await query.refetch()
        }}
      >
        <div className="h5-stack">
          {query.isPending || query.isPlaceholderData ? (
            <Loading />
          ) : query.isError ? (
            <Failure
              error={query.error}
              retry={() => {
                void query.refetch()
              }}
            />
          ) : !records.length ? (
            <Empty title="暂无匹配告警" />
          ) : (
            records.map((a) => (
              <Card key={a.id}>
                <div className="h5-row">
                  <div className="h5-tags">
                    <span className={`h5-level level-${a.level}`}>{LEVELS[a.level] ?? `级别${a.level}`}</span>
                    <span className="h5-chip">{ALARM_STATES[a.status] ?? a.status}</span>
                    <span className="h5-chip">{a.processed ? '已处理' : '未处理'}</span>
                  </div>
                  {multi && !a.processed && (
                    <Checkbox
                      checked={selected.includes(a.id)}
                      onChange={(checked) =>
                        setSelected((v) => (checked ? [...v, a.id] : v.filter((id) => id !== a.id)))
                      }
                      aria-label={`选择${a.description}`}
                    />
                  )}
                </div>
                <Link className="h5-alarm-title" to={`${base}/alarms/${a.id}`}>
                  {a.description || '设备告警'} ›
                </Link>
                <small>
                  {a.deviceName} · SN {a.deviceSn} · {TYPES[a.type]}
                </small>
                <small className="h5-muted">
                  最近 {fmtDateTime(a.lastAlarmAt)} · 累计 {a.alarmCount} 次
                </small>
                {!a.processed && !multi && (
                  <Button size="small" fill="outline" onClick={() => setProcessing([a.id])}>
                    处理
                  </Button>
                )}
                {a.processed && (
                  <small className="h5-muted">
                    {a.processorName} · {fmtDateTime(a.processedAt)}
                  </small>
                )}
              </Card>
            ))
          )}
        </div>
      </PullToRefresh>
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
      {multi && (
        <div className="h5-batch-bar">
          <span>已选 {selected.length} 条</span>
          <Button color="primary" disabled={!selected.length} onClick={() => setProcessing(selected)}>
            处理所选
          </Button>
        </div>
      )}
      <Sheet title="告警筛选" visible={filter} close={() => setFilter(false)}>
        <Choice
          label="园区"
          value={q.siteId ? String(q.siteId) : ''}
          options={[
            { label: '全部园区', value: '' },
            ...(sites.data ?? []).map((s) => ({ label: s.name, value: String(s.id) })),
          ]}
          onChange={(v) => patch({ siteId: v, deviceId: '' })}
        />
        {q.deviceId && (
          <Button block onClick={() => patch({ deviceId: '' })}>
            清除当前设备范围 #{q.deviceId}
          </Button>
        )}
        <Choice
          label="级别"
          value={q.level ? String(q.level) : ''}
          options={[
            { label: '全部', value: '' },
            ...Object.entries(LEVELS).map(([value, label]) => ({ value, label })),
          ]}
          onChange={(v) => patch({ level: v })}
        />
        <Choice
          label="类型"
          value={q.type}
          options={[{ label: '全部', value: '' }, ...Object.entries(TYPES).map(([value, label]) => ({ value, label }))]}
          onChange={(v) => patch({ type: v })}
        />
        <Choice
          label="告警状态"
          value={q.status}
          options={[
            { label: '全部', value: '' },
            ...Object.entries(ALARM_STATES).map(([value, label]) => ({ value, label })),
          ]}
          onChange={(v) => patch({ status: v })}
        />
        <TimeFilter start={q.start} end={q.end} apply={(start, end) => patch({ start, end })} />
        <Button block onClick={() => setParams(q.siteId ? { siteId: String(q.siteId) } : {})}>
          清除筛选
        </Button>
        <Button block color="primary" onClick={() => setFilter(false)}>
          完成
        </Button>
      </Sheet>
      <ProcessSheet
        ids={processing}
        close={() => setProcessing(null)}
        done={() => {
          setSelected([])
          setMulti(false)
        }}
      />
    </Page>
  )
}
export function ProcessSheet({ ids, close, done }: { ids: number[] | null; close: () => void; done?: () => void }) {
  const cid = useCompanyId(),
    me = useMe(),
    [remark, setRemark] = useState(''),
    [busy, setBusy] = useState(false),
    lock = useRef(false),
    alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: each selected ID set starts a new processing form
  useEffect(() => {
    setRemark('')
  }, [ids])
  const submit = async () => {
    if (!ids?.length || lock.current) return
    lock.current = true
    setBusy(true)
    try {
      const result = await processAlarms(cid, ids, remark.trim())
      if (alive.current) {
        Toast.show({
          content: `实际处理 ${result.affected} 条告警${result.affected < ids.length ? '，其余可能已被他人处理或不再可访问' : ''}`,
        })
        done?.()
        close()
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['app', cid, 'alarms'] }),
        queryClient.invalidateQueries({ queryKey: ['app', cid, 'devices'] }),
      ])
    } catch (e) {
      if (alive.current) showFailure(e)
    } finally {
      lock.current = false
      if (alive.current) setBusy(false)
    }
  }
  return (
    <Sheet
      title={`处理 ${ids?.length ?? 0} 条告警`}
      visible={!!ids}
      close={() => {
        if (!busy) close()
      }}
    >
      <p className="h5-notice">
        只处理所选 ID，不会处理其他记录。人工处理不代表异常已解除；处理状态对同一设备的其他授权企业共享。
      </p>
      <p>处理人：{me.nickname || me.username}</p>
      <TextArea
        placeholder="处理备注（选填）"
        value={remark}
        onChange={setRemark}
        maxLength={2000}
        showCount
        autoSize={{ minRows: 3, maxRows: 6 }}
        disabled={busy}
      />
      <Button block color="primary" loading={busy} onClick={submit}>
        确认处理
      </Button>
    </Sheet>
  )
}
function AlarmDetail({ id }: { id: number }) {
  const cid = useCompanyId(),
    query = useQuery(alarmDetailQuery(cid, id)),
    [processing, setProcessing] = useState<number[] | null>(null),
    a = query.data
  return (
    <Page title="告警详情">
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <Failure
          error={query.error}
          retry={() => {
            void query.refetch()
          }}
        />
      ) : (
        a && (
          <>
            <Card>
              <div className="h5-tags">
                <span className={`h5-level level-${a.level}`}>{LEVELS[a.level] ?? a.level}</span>
                <span className="h5-chip">{ALARM_STATES[a.status]}</span>
                <span className="h5-chip">{a.processed ? '已处理' : '未处理'}</span>
              </div>
              <h1>{a.description || '设备告警'}</h1>
              <p>
                {a.deviceName} · SN {a.deviceSn}
              </p>
            </Card>
            <Card title="告警详情">
              <dl className="h5-dl">
                {[
                  ['类型', TYPES[a.type]],
                  ['首次发生', fmtDateTime(a.createdAt)],
                  ['最近发生', fmtDateTime(a.lastAlarmAt)],
                  ['结束时间', fmtDateTime(a.endedAt)],
                  ['累计次数', a.alarmCount],
                  ['触发值', a.triggerValue ?? '—'],
                  ['持续期间极值', a.peakValue ?? '—'],
                  ['通道', a.channel ?? '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            {a.processed ? (
              <Card title="处理信息">
                <p>
                  {a.processorName} · {fmtDateTime(a.processedAt)}
                </p>
                <p>{a.processRemark || '未填写备注'}</p>
              </Card>
            ) : (
              <Button block color="primary" onClick={() => setProcessing([a.id])}>
                处理此告警
              </Button>
            )}
            <p className="h5-notice">告警状态与人工处理分别记录；“已处理”不代表设备异常已经解除。</p>
            <Link className="h5-navigation-card" to={`/h5/${cid}/devices?deviceId=${a.deviceId}`}>
              查看关联设备 ›
            </Link>
          </>
        )
      )}
      <ProcessSheet ids={processing} close={() => setProcessing(null)} />
    </Page>
  )
}
export function TimeFilter({
  start,
  end,
  apply,
}: {
  start?: string
  end?: string
  apply: (start: string, end: string) => void
}) {
  const [a, setA] = useState(start ? dayTime(start) : ''),
    [b, setB] = useState(end ? dayTime(end) : '')
  useEffect(() => {
    setA(start ? dayTime(start) : '')
    setB(end ? dayTime(end) : '')
  }, [start, end])
  return (
    <>
      <label className="h5-field">
        开始时间
        <input
          type="datetime-local"
          min={bizNow().subtract(1, 'month').startOf('month').format('YYYY-MM-DDTHH:mm')}
          value={a}
          onChange={(e) => setA(e.target.value)}
        />
      </label>
      <label className="h5-field">
        结束时间
        <input
          type="datetime-local"
          value={b}
          max={bizNow().format('YYYY-MM-DDTHH:mm')}
          onChange={(e) => setB(e.target.value)}
        />
      </label>
      <Button
        block
        onClick={() => {
          if ((a && !b) || (!a && b) || (a && b && (a >= b || b > bizNow().format('YYYY-MM-DDTHH:mm')))) {
            Toast.show('请填写完整有效的时间范围')
            return
          }
          apply(a ? dayToQuery(a) : '', b ? dayToQuery(b) : '')
        }}
      >
        应用时间
      </Button>
    </>
  )
}

import { BIZ_TZ, dayjs } from '@/lib/time'

const dayTime = (s: string) => dayjs(s).tz(BIZ_TZ).format('YYYY-MM-DDTHH:mm')
const dayToQuery = (s: string) => dayjs.tz(s, BIZ_TZ).format()
