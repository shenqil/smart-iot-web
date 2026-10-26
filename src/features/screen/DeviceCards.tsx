import { ClusterOutlined, LeftOutlined, LockOutlined, RightOutlined, UnlockOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Select } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { AppDevice } from '@/features/device/api'
import { operationsQuery } from '@/features/relay/api'
import { useRelayControl } from '@/features/relay/useRelayControl'
import { dailyComparisonQuery } from '@/features/telemetry/comparison/api'
import { hourlySeries } from '@/features/telemetry/lib/comparison'
import {
  type AppSensor,
  agoText,
  byChannel,
  channelName,
  opDisplayStatus,
  type Realtime,
  readSensor,
} from '@/features/telemetry/lib/realtime'
import { Sparkline } from '@/features/telemetry/realtime/Sparkline'
import { useReadingTrail } from '@/features/telemetry/realtime/useReadingTrail'
import { useCompanyId } from '@/hooks/session'
import { type ECOption, useECharts } from '@/hooks/useECharts'
import { useNow } from '@/hooks/useNow'
import { decimalsOf } from '@/lib/resolution'
import { bizNow, dayjs } from '@/lib/time'
import type { Rect } from './layout'
import { Panel, PanelEmpty, PanelError } from './Panel'

const DEVICE_STATUS: Record<string, string> = { active: '启用', inactive: '停用', fault: '损坏' }

/** ④ 设备信息 (固定)：设备切换 (上一台 / 下一台 / 下拉) + 基本信息 + 已配置通道 */
export function DeviceInfoCard({
  device,
  candidates,
  onChange,
  typeName,
  typeIcon,
  siteName,
  realtime,
  alarms,
  rect,
}: {
  rect: Rect
  device: AppDevice | undefined
  candidates: AppDevice[]
  onChange: (id: number) => void
  typeName: string
  typeIcon?: string
  siteName: string
  realtime: Realtime | undefined
  alarms: number
}) {
  const now = useNow(5_000)
  const idx = device ? candidates.findIndex((d) => d.id === device.id) : -1
  const step = (n: number) => {
    if (!candidates.length) return
    onChange(candidates[(idx + n + candidates.length) % candidates.length].id)
  }
  const online = realtime?.online ?? device?.online ?? false
  const updated = realtime?.sensorsAt ?? realtime?.relaysAt
  const sensors = device?.sensors?.length ?? 0
  const relays = device?.relays?.length ?? 0
  const tag = (on: boolean) =>
    on ? 'border-[rgb(34_211_238/0.5)] text-[#67e8f9]' : 'border-[rgb(148_163_184/0.3)] text-[var(--sc-text-3)]'
  return (
    <Panel
      title="设备信息"
      rect={rect}
      extra={
        candidates.length > 0 && (
          <>
            <button type="button" className="screen-btn px-1.5" aria-label="上一台设备" onClick={() => step(-1)}>
              <LeftOutlined />
            </button>
            <Select
              size="small"
              value={device?.id}
              onChange={onChange}
              showSearch={{ optionFilterProp: 'label' }}
              popupMatchSelectWidth={false}
              className="w-[180px]"
              options={candidates.map((d) => ({ value: d.id, label: d.name }))}
              aria-label="切换设备"
            />
            <button type="button" className="screen-btn px-1.5" aria-label="下一台设备" onClick={() => step(1)}>
              <RightOutlined />
            </button>
          </>
        )
      }
    >
      {!device ? (
        <PanelEmpty>该园区没有可展示的设备 (摄像头在「实时监控」中查看)</PanelEmpty>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-3.5">
            <div className="flex size-[52px] flex-none items-center justify-center rounded-lg border border-[rgb(34_211_238/0.35)] border-solid bg-[rgb(34_211_238/0.12)] text-[26px] text-[var(--sc-accent)]">
              {typeIcon ? (
                <img src={typeIcon} alt="" className="size-7 object-contain brightness-0 invert" />
              ) : (
                <ClusterOutlined />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-[20px]" title={device.name}>
                {device.name}
              </div>
              <div className="mt-1 flex gap-3 text-[13px]">
                <span className={online ? 'text-[#22d3ee]' : 'text-[#cbd5e1]'}>{online ? '● 在线' : '○ 离线'}</span>
                {updated && <span className="text-[var(--sc-text-2)]">{agoText(updated, now)}更新</span>}
                {alarms > 0 && <span className="text-[#fca5a5]">⚠ {alarms} 条告警</span>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[64px_minmax(0,1fr)_64px_minmax(0,1fr)] gap-x-2 gap-y-2.5 text-[13px]">
            <span className="text-[var(--sc-text-3)]">设备编号</span>
            <span className="screen-num truncate text-[15px]" title={device.deviceSn}>
              {device.deviceSn}
            </span>
            <span className="text-[var(--sc-text-3)]">设备类型</span>
            <span className="truncate">{typeName}</span>
            <span className="text-[var(--sc-text-3)]">所属园区</span>
            <span className="truncate">{siteName}</span>
            <span className="text-[var(--sc-text-3)]">采集间隔</span>
            <span>{device.readInterval} 秒</span>
            <span className="text-[var(--sc-text-3)]">设备状态</span>
            <span>{DEVICE_STATUS[device.status] ?? device.status}</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[12px]">
            <span className="w-16 text-[var(--sc-text-3)]">已配置通道</span>
            <span className={`rounded-[3px] border border-solid px-2 py-0.5 ${tag(sensors > 0)}`}>
              传感器 {sensors}
            </span>
            <span className={`rounded-[3px] border border-solid px-2 py-0.5 ${tag(relays > 0)}`}>继电器 {relays}</span>
          </div>
          {sensors === 0 && relays === 0 && (
            <div className="mt-2.5 rounded border border-[rgb(245_158_11/0.4)] border-solid bg-[rgb(245_158_11/0.1)] px-2.5 py-2 text-[#fde68a] text-[12px] leading-normal">
              该设备还没有配置传感器和继电器通道，暂无实时数据。可在管理后台 › 设备配置中设置。
            </div>
          )}
        </>
      )}
    </Panel>
  )
}

/** 右侧槽位：实时数据 (当前设备有传感器通道时显示) */
export function RealtimeCard({
  device,
  realtime,
  failed,
  rect,
}: {
  device: AppDevice
  realtime: Realtime | undefined
  failed: boolean
  rect: Rect
}) {
  const now = useNow(5_000)
  const sensors = byChannel(device.sensors)
  const trail = useReadingTrail(realtime?.sensors, realtime?.sensorsAt)
  const online = realtime?.online ?? device.online
  const readings = sensors.map((c) => readSensor(c, realtime?.sensors))
  return (
    <Panel
      title="实时数据"
      rect={rect}
      extra={
        <span className="text-[12px] text-[var(--sc-text-3)]">
          {online
            ? `${sensors.length} 个通道 · 10 秒刷新`
            : `离线 · ${realtime?.sensorsAt ? `${agoText(realtime.sensorsAt, now)}的数据` : '暂无数据'}`}
        </span>
      }
    >
      {failed && !realtime ? (
        <PanelError />
      ) : (
        <div className={`screen-scroll grid grid-cols-2 content-start gap-2 ${online ? '' : 'opacity-60'}`}>
          {readings.map((r) => {
            const out = r.state === 'over' || r.state === 'under'
            return (
              <div
                key={r.config.channelNum}
                className={`flex h-[52px] items-center gap-2 rounded border border-solid px-2.5 ${
                  out
                    ? 'border-[rgb(245_158_11/0.4)] bg-[rgb(245_158_11/0.08)]'
                    : 'border-[rgb(34_211_238/0.14)] bg-[rgb(34_211_238/0.05)]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] text-[var(--sc-text-2)]" title={r.name}>
                    {r.name}
                    {out && <span className="ml-1.5 text-[#fcd34d]">超量程</span>}
                  </div>
                  <div className="truncate leading-tight">
                    <span
                      className={`screen-num font-semibold text-[22px] ${out ? 'text-[#fcd34d]' : 'text-[#f1f5f9]'}`}
                    >
                      {realtime ? r.text : '…'}
                    </span>
                    {r.value != null && r.config.unit && (
                      <span className="text-[11px] text-[var(--sc-text-3)]"> {r.config.unit}</span>
                    )}
                  </div>
                </div>
                <div className="w-[60px] flex-none">
                  <Sparkline values={trail[r.config.channelNum] ?? []} color={out ? '#f59e0b' : '#22d3ee'} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}

const OP_COLOR: Record<string, { label: string; color: string }> = {
  pending: { label: '执行中', color: '#93c5fd' },
  success: { label: '✓ 成功', color: '#67e8f9' },
  failed: { label: '✕ 失败', color: '#fca5a5' },
  timeout: { label: '… 未应答', color: '#fcd34d' },
}

/** 右侧槽位：操作记录 (当前设备有继电器通道且右侧还有空位时显示) */
export function OperationsCard({ device, rect }: { device: AppDevice; rect: Rect }) {
  const companyId = useCompanyId()
  const ops = useQuery({
    ...operationsQuery(companyId, { deviceId: device.id, sort: '-createdAt', page: 1, pageSize: 30 }),
    refetchInterval: 30_000,
  })
  const relayName = (ch: number) => {
    const r = device.relays?.find((x) => x.channelNum === ch)
    return r ? channelName(r) : `通道 ${ch}`
  }
  const records = ops.data?.records ?? []
  return (
    <Panel
      title="操作记录"
      rect={rect}
      extra={<span className="truncate text-[12px] text-[var(--sc-text-3)]">{device.name}</span>}
    >
      {ops.isError && !ops.data ? (
        <PanelError onRetry={() => ops.refetch()} />
      ) : ops.data && records.length === 0 ? (
        <PanelEmpty>还没有继电器操作记录</PanelEmpty>
      ) : (
        <>
          <div className="flex h-6 items-center gap-2 px-1 text-[12px] text-[var(--sc-text-3)]">
            <span className="w-[66px]">时间</span>
            <span className="w-12">操作人</span>
            <span className="flex-1">操作</span>
            <span className="w-[76px] text-right">结果</span>
          </div>
          <div className="screen-scroll">
            {records.map((o) => {
              const st = OP_COLOR[opDisplayStatus(o)] ?? { label: o.status, color: '#cbd5e1' }
              const t = dayjs(o.createdAt)
              return (
                <div key={o.id} className="screen-row" style={{ gap: 8 }}>
                  <span
                    className="screen-num w-[66px] flex-none text-[14px] text-[var(--sc-text-2)]"
                    title={o.createdAt}
                  >
                    {t.isSame(dayjs(), 'day') ? t.format('HH:mm:ss') : t.format('MM-DD HH:mm')}
                  </span>
                  <span className="w-12 flex-none truncate text-[#cbd5e1]">{o.operatorName || '—'}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {o.targetState ? '开启' : '关闭'} <b className="font-medium">{relayName(o.relayIndex)}</b>
                  </span>
                  <span className="w-[76px] flex-none text-right" style={{ color: st.color }} title={o.errorMessage}>
                    {st.label}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </Panel>
  )
}

const HOURS = Array.from({ length: 24 }, (_, h) => `${h}时`)

/** 底部：今日曲线 (当前设备有传感器通道时显示)；整点值，叠加昨天 */
export function TrendCard({ device, rect }: { device: AppDevice; rect: Rect }) {
  const companyId = useCompanyId()
  const sensors = byChannel(device.sensors)
  const [channel, setChannel] = useState(sensors[0]?.channelNum ?? 0)
  const today = bizNow().format('YYYY-MM-DD')
  const yesterday = bizNow().subtract(1, 'day').format('YYYY-MM-DD')
  const t = useQuery({ ...dailyComparisonQuery(companyId, device.id, today), refetchInterval: 5 * 60_000 })
  const y = useQuery(dailyComparisonQuery(companyId, device.id, yesterday))
  const config: AppSensor | undefined = sensors.find((s) => s.channelNum === channel) ?? sensors[0]
  const digits = decimalsOf(config?.resolution)
  const todayVals = hourlySeries(t.data?.records, config?.channelNum ?? 0)
  const yesterdayVals = hourlySeries(y.data?.records, config?.channelNum ?? 0)
  const empty = t.data && y.data && todayVals.every((v) => v == null) && yesterdayVals.every((v) => v == null)

  const option: ECOption = {
    animation: false,
    grid: { left: 44, right: 14, top: 14, bottom: 26 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(5,19,33,.95)',
      borderColor: 'rgba(34,211,238,.4)',
      textStyle: { color: '#e6f1f8' },
      valueFormatter: (v) => (typeof v === 'number' ? `${v.toFixed(digits)} ${config?.unit ?? ''}` : '—'),
    },
    xAxis: {
      type: 'category',
      data: HOURS,
      boundaryGap: false,
      axisLine: { lineStyle: { color: 'rgba(148,163,184,.3)' } },
      axisTick: { show: false },
      axisLabel: { color: '#7f9bb3', interval: rect.width > 700 ? 2 : 3 },
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitLine: { lineStyle: { color: 'rgba(148,163,184,.14)' } },
      axisLabel: { color: '#7f9bb3' },
    },
    series: [
      {
        name: '昨天',
        type: 'line',
        data: yesterdayVals,
        symbol: 'none',
        lineStyle: { color: '#94a3b8', width: 1.6, type: 'dashed' },
        itemStyle: { color: '#94a3b8' },
      },
      {
        name: '今天',
        type: 'line',
        data: todayVals,
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: false,
        lineStyle: { color: '#22d3ee', width: 2.4 },
        itemStyle: { color: '#22d3ee' },
        areaStyle: { color: 'rgba(34,211,238,.12)' },
      },
    ],
  }
  const { ref } = useECharts(option)

  const tabs = sensors.length <= 4
  return (
    <Panel
      title="今日曲线"
      rect={rect}
      extra={
        <>
          <span className="truncate text-[12px] text-[var(--sc-text-2)]">{device.name} · 整点值</span>
          {tabs ? (
            sensors.map((s) => (
              <button
                key={s.channelNum}
                type="button"
                className={`screen-btn ${s.channelNum === config?.channelNum ? 'is-active' : 'is-quiet'}`}
                style={{ height: 26, fontSize: 12 }}
                onClick={() => setChannel(s.channelNum)}
              >
                {channelName(s)}
              </button>
            ))
          ) : (
            <Select
              size="small"
              value={config?.channelNum}
              onChange={setChannel}
              className="w-[140px]"
              popupMatchSelectWidth={false}
              options={sensors.map((s) => ({ value: s.channelNum, label: channelName(s) }))}
              aria-label="选择通道"
            />
          )}
        </>
      }
    >
      <div className="-mt-1 mb-0.5 flex gap-4 text-[12px] text-[var(--sc-text-2)]">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-[#22d3ee]" />
          今天
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-[#94a3b8] border-t-2 border-dashed" />
          昨天
        </span>
        <span className="ml-auto">
          {channelName(config ?? { channelNum: channel })}
          {config?.unit ? ` · 单位 ${config.unit}` : ''}
        </span>
      </div>
      {t.isError && !t.data ? (
        <PanelError onRetry={() => t.refetch()} />
      ) : (
        <div className="relative min-h-0 flex-1">
          <div ref={ref} className="absolute inset-0" />
          {empty && <PanelEmpty>今天和昨天都还没有整点数据</PanelEmpty>}
        </div>
      )}
    </Panel>
  )
}

const UNLOCK_MS = 5 * 60_000

/** 继电器解锁状态：解锁后 5 分钟内可控制，到时自动锁定 (大屏防误触) */
export function useRelayUnlock() {
  const [until, setUntil] = useState<number | null>(null)
  useEffect(() => {
    if (until == null) return
    const t = window.setTimeout(() => setUntil(null), Math.max(0, until - Date.now()))
    return () => clearTimeout(t)
  }, [until])
  return { until, unlock: () => setUntil(Date.now() + UNLOCK_MS), lock: () => setUntil(null) }
}

/** 底部：继电器控制 (当前设备有继电器通道时显示)；默认锁定，解锁后 5 分钟内可操作，开启需再确认 */
export function RelayCard({
  device,
  realtime,
  rect,
  unlock,
  recordsLink,
}: {
  device: AppDevice
  realtime: Realtime | undefined
  rect: Rect
  unlock: ReturnType<typeof useRelayUnlock>
  /** 操作记录卡片被省略时，标题栏给出入口 */
  recordsLink?: string
}) {
  const now = useNow(1_000)
  const { busy, blocked, toggle, stateOf, links } = useRelayControl(device, realtime)
  const relays = byChannel(device.relays)
  const locked = unlock.until == null || unlock.until <= now
  const left = locked ? 0 : Math.ceil(((unlock.until ?? 0) - now) / 1000)
  const wide = rect.width > 700
  return (
    <Panel
      title="继电器控制"
      rect={rect}
      extra={
        <>
          {recordsLink && (
            <Link to={recordsLink} className="whitespace-nowrap text-[12px] text-[#67e8f9]">
              操作记录 ›
            </Link>
          )}
          {locked ? (
            <>
              <span className="text-[12px] text-[var(--sc-text-3)]">
                <LockOutlined /> 已锁定
              </span>
              <button
                type="button"
                className="screen-btn is-warn"
                style={{ height: 26, fontSize: 12 }}
                onClick={unlock.unlock}
              >
                <UnlockOutlined />
                解锁控制
              </button>
            </>
          ) : (
            <>
              <span className="whitespace-nowrap text-[#fcd34d] text-[12px]">
                <span className="screen-num text-[14px]">
                  {String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
                </span>{' '}
                后锁定
              </span>
              <button
                type="button"
                className="screen-btn is-quiet"
                style={{ height: 26, fontSize: 12 }}
                onClick={unlock.lock}
              >
                锁定
              </button>
            </>
          )}
        </>
      }
    >
      {blocked && <div className="-mt-1 mb-2 text-[#fcd34d] text-[12px]">⚠ {blocked}，暂时无法控制</div>}
      <div
        className="screen-scroll grid content-start gap-2"
        style={{ gridTemplateColumns: `repeat(${wide ? 4 : 2}, minmax(0, 1fr))` }}
      >
        {relays.map((r) => {
          const st = stateOf(r)
          const loading = busy.has(r.channelNum)
          const reason = locked ? '先点「解锁控制」' : (blocked ?? (st === 'unknown' ? '暂无状态数据' : null))
          const on = st === 'on'
          return (
            <div
              key={r.channelNum}
              className="flex h-11 items-center gap-2 rounded border border-[rgb(148_163_184/0.14)] border-solid bg-[rgb(148_163_184/0.07)] pr-2 pl-2.5"
            >
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[13px]" title={channelName(r)}>
                  {channelName(r)}
                </div>
                <div
                  className={`text-[11px] ${loading ? 'text-[#fcd34d]' : on ? 'text-[#67e8f9]' : 'text-[var(--sc-text-3)]'}`}
                >
                  通道 {r.channelNum} · {loading ? '执行中' : on ? '运行' : st === 'off' ? '停止' : '状态未知'}
                  {links.get(r.channelNum)?.hold
                    ? ' · 手动接管'
                    : links.get(r.channelNum)?.linkages.length
                      ? ' · 联动'
                      : ''}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-busy={loading}
                aria-label={`${channelName(r)}开关`}
                title={reason ?? undefined}
                disabled={Boolean(reason) || loading}
                className={`screen-switch ${on ? 'is-on' : 'is-off'}`}
                onClick={() => toggle(r, !on)}
              >
                {on && <span className="mr-1">开</span>}
                <span className="screen-switch__knob">{loading && <span className="screen-spin" />}</span>
                {!on && <span className="ml-1">关</span>}
              </button>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
