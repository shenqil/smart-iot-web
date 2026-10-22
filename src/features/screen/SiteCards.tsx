import { FlagOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { type AlarmView, scopedUnprocessedCountQuery } from '@/features/alarm/api'
import { ALARM_LEVEL } from '@/features/alarm/enums'
import type { AppDevice } from '@/features/device/api'
import { type SiteView, weatherQuery } from '@/features/site/api'
import { agoText } from '@/features/telemetry/lib/realtime'
import { useCompanyId } from '@/hooks/session'
import { joinAddress } from '@/lib/address'
import { dayjs } from '@/lib/time'
import type { Rect } from './layout'
import { Panel, PanelEmpty } from './Panel'

const SITE_STATUS: Record<string, { label: string; color: string }> = {
  active: { label: '运营中', color: '#67e8f9' },
  under_construction: { label: '建设中', color: '#fcd34d' },
  inactive: { label: '已停用', color: '#94a3b8' },
}

/** 园区自定义属性里可直接展示的字段 (字符串 / 数字)，最多 3 个 */
const propertyEntries = (p: SiteView['properties'] | null | undefined) =>
  Object.entries(p ?? {})
    .filter(([, v]) => (typeof v === 'string' && v.trim()) || typeof v === 'number')
    .slice(0, 3) as [string, string | number][]

/** ① 天气 · 园区信息 (固定) */
export function WeatherSiteCard({
  site,
  devices,
  cameras,
  rect,
}: {
  site: SiteView
  devices: number
  cameras: number
  rect: Rect
}) {
  const located = site.latitude != null && site.longitude != null
  const weather = useQuery({
    ...weatherQuery(site.latitude ?? 0, site.longitude ?? 0),
    enabled: located,
    refetchInterval: 10 * 60_000,
  }).data
  const cover = site.coverImage || site.images?.[0]
  const status = SITE_STATUS[site.status] ?? SITE_STATUS.inactive
  const props = propertyEntries(site.properties)
  return (
    <Panel
      title="天气 · 园区信息"
      rect={rect}
      extra={
        weather && (
          <span className="text-[12px] text-[var(--sc-text-3)]">
            {weather.stale ? '天气服务暂不可用 · ' : ''}发布于 {dayjs(weather.updateTime).format('HH:mm')}
          </span>
        )
      }
    >
      <div className="flex min-h-[64px] items-center gap-4 border-[rgb(148_163_184/0.2)] border-b border-dashed pb-3">
        {weather ? (
          <>
            <div className="whitespace-nowrap">
              <span className="screen-num font-bold text-[40px] leading-none">{weather.temperature}</span>
              <span className="text-[15px] text-[var(--sc-text-2)]"> ℃ {weather.weather}</span>
            </div>
            <div className="ml-auto grid grid-cols-2 gap-x-4 gap-y-1 whitespace-nowrap text-[12px] text-[var(--sc-text-2)]">
              <span>
                湿度 <b className="screen-num text-[15px] text-white">{weather.humidity}%</b>
              </span>
              <span>
                风向 <b className="text-white">{weather.windDirection || '—'}</b>
              </span>
              <span>
                风力 <b className="text-white">{weather.windPower || '—'}</b>
              </span>
              <span className="max-w-[110px] truncate">
                {[weather.city, weather.district].filter(Boolean).join(' · ')}
              </span>
            </div>
          </>
        ) : (
          <span className="text-[13px] text-[var(--sc-text-3)]">
            {located ? '暂无天气数据' : '园区未设置坐标，无法获取天气'}
          </span>
        )}
      </div>
      <div className="mt-3 flex min-h-0 flex-1 gap-3.5">
        <div className="relative h-[112px] w-[116px] flex-none overflow-hidden rounded border border-[rgb(148_163_184/0.25)] border-solid bg-[#13241d]">
          {cover ? (
            <img src={cover} alt={`${site.name}封面`} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-[28px] text-[rgb(34_211_238/0.5)]">
              <FlagOutlined />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-[13px]">
          <div className="flex items-center gap-2">
            <span className="truncate font-bold text-[16px]">{site.name}</span>
            <span
              className="flex-none rounded-[3px] border border-solid px-1.5 text-[12px]"
              style={{ color: status.color, borderColor: status.color }}
            >
              ● {status.label}
            </span>
          </div>
          <div className="line-clamp-2 text-[#cbd5e1] leading-snug" title={joinAddress(site)}>
            {joinAddress(site) || '未填写地址'}
          </div>
          {props.map(([k, v]) => (
            <div key={k} className="truncate text-[var(--sc-text-2)]">
              {k} <b className="font-medium text-white">{v}</b>
            </div>
          ))}
          <div className="flex gap-3.5 whitespace-nowrap text-[var(--sc-text-2)]">
            <span>
              设备 <b className="screen-num text-[15px] text-white">{devices}</b> 台
            </span>
            <span>
              摄像头 <b className="text-white">{cameras ? `${cameras} 路` : '无'}</b>
            </span>
          </div>
        </div>
      </div>
    </Panel>
  )
}

const TYPE_COLORS = ['#22d3ee', '#3b82f6', '#f59e0b', '#a78bfa', '#34d399', '#f472b6', '#fb923c', '#94a3b8']

/** ② 设备类型分布 (固定)：按设备类型统计当前园区设备 */
export function DeviceTypeCard({
  devices,
  typeName,
  rect,
}: {
  devices: AppDevice[]
  typeName: (d: AppDevice) => string
  rect: Rect
}) {
  const counts = new Map<string, number>()
  for (const d of devices) counts.set(typeName(d), (counts.get(typeName(d)) ?? 0) + 1)
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const total = devices.length
  const max = rows[0]?.[1] ?? 1
  const R = 64
  const C = 2 * Math.PI * R
  let acc = 0
  const segs = rows.map(([name, n], i) => {
    const len = (C * n) / total
    const gap = rows.length > 1 ? 2.5 : 0
    const s = {
      name,
      n,
      color: TYPE_COLORS[i % TYPE_COLORS.length],
      dash: `${len - gap} ${C - len + gap}`,
      offset: -acc,
    }
    acc += len
    return s
  })
  return (
    <Panel
      title="设备类型分布"
      rect={rect}
      extra={<span className="text-[12px] text-[var(--sc-text-3)]">共 {rows.length} 类</span>}
    >
      {total === 0 ? (
        <PanelEmpty>该园区还没有设备</PanelEmpty>
      ) : (
        <div className="flex min-h-0 flex-1 items-center gap-5">
          <div className="relative size-[170px] flex-none">
            <svg
              width="170"
              height="170"
              viewBox="0 0 170 170"
              className="-rotate-90"
              role="img"
              aria-label="设备类型分布"
            >
              <circle cx="85" cy="85" r={R} fill="none" stroke="rgb(148 163 184 / 0.12)" strokeWidth="18" />
              {segs.map((s) => (
                <circle
                  key={s.name}
                  cx="85"
                  cy="85"
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="18"
                  strokeDasharray={s.dash}
                  strokeDashoffset={s.offset}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="screen-num font-bold text-[36px] leading-none">{total}</span>
              <span className="text-[12px] text-[var(--sc-text-2)]">设备总数</span>
            </div>
          </div>
          <div className="screen-scroll flex max-h-full flex-col justify-center gap-2.5 py-1">
            {segs.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-[13px]">
                <span className="size-2.5 flex-none rounded-[2px]" style={{ background: s.color }} />
                <span className="w-[72px] truncate text-[#cbd5e1]" title={s.name}>
                  {s.name}
                </span>
                <span className="h-1 min-w-[40px] flex-1 rounded-sm bg-[rgb(148_163_184/0.15)]">
                  <span
                    className="block h-1 rounded-sm"
                    style={{ width: `${Math.round((s.n / max) * 100)}%`, background: s.color }}
                  />
                </span>
                <span className="screen-num w-7 text-right text-[16px]">{s.n}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}

const LEVEL_COLOR: Record<number, string> = { 1: '#f87171', 2: '#fb923c', 3: '#facc15', 4: '#60a5fa' }

function useLevelCounts(siteId: number) {
  const companyId = useCompanyId()
  const q = (level: number) => ({
    ...scopedUnprocessedCountQuery(companyId, { siteId, level }),
    refetchInterval: 30_000,
  })
  return [useQuery(q(1)).data, useQuery(q(2)).data, useQuery(q(3)).data, useQuery(q(4)).data]
}

const countText = (c: { count: number; capped: boolean } | undefined) => (c ? (c.capped ? '999+' : c.count) : '…')

/** ③ 设备告警 (固定)：四个级别的未处理数 + 最新告警 (可滚动，不显示滚动条)；点击告警切换到该设备 */
export function AlarmCard({
  siteId,
  total,
  alarms,
  onPick,
  rect,
}: {
  rect: Rect
  siteId: number
  total: { count: number; capped: boolean } | undefined
  alarms: AlarmView[] | undefined
  onPick: (deviceId: number) => void
}) {
  const levels = useLevelCounts(siteId)
  return (
    <Panel
      title="设备告警"
      rect={rect}
      extra={<span className="text-[12px] text-[var(--sc-text-3)]">未处理 {countText(total)} 条</span>}
    >
      <div className="mb-2.5 grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((lv, i) => (
          <div
            key={lv}
            className="rounded border border-solid py-1 text-center"
            style={{ borderColor: `${LEVEL_COLOR[lv]}73`, background: `${LEVEL_COLOR[lv]}1a` }}
          >
            <div className="screen-num font-bold text-[24px] leading-tight" style={{ color: LEVEL_COLOR[lv] }}>
              {countText(levels[i])}
            </div>
            <div className="text-[#cbd5e1] text-[12px]">{ALARM_LEVEL[lv].label}</div>
          </div>
        ))}
      </div>
      {alarms && alarms.length === 0 ? (
        <PanelEmpty>
          <SafetyCertificateOutlined className="text-[40px] text-[var(--sc-accent)]" />
          <span className="text-[14px] text-white">暂无未处理告警</span>
          <span>园区设备运行正常</span>
        </PanelEmpty>
      ) : (
        <div className="screen-scroll">
          {(alarms ?? []).map((a) => (
            <button key={a.id} type="button" className="screen-row" onClick={() => onPick(a.deviceId)}>
              <span
                className="w-9 flex-none rounded-[3px] border border-solid py-px text-center text-[12px]"
                style={{ color: LEVEL_COLOR[a.alarmLevel], borderColor: LEVEL_COLOR[a.alarmLevel] }}
              >
                {ALARM_LEVEL[a.alarmLevel]?.label ?? a.alarmLevel}
              </span>
              <span className="screen-num w-[52px] flex-none text-[14px] text-[var(--sc-text-2)]" title={a.lastAlarmAt}>
                {dayjs(a.lastAlarmAt).isSame(dayjs(), 'day')
                  ? dayjs(a.lastAlarmAt).format('HH:mm')
                  : agoText(a.lastAlarmAt)}
              </span>
              <span className="w-[96px] flex-none truncate" title={a.deviceName}>
                {a.deviceName}
              </span>
              <span className="min-w-0 flex-1 truncate text-[var(--sc-text-2)]" title={a.description}>
                {a.description || '告警'}
                {a.alarmCount > 1 && ` · ${a.alarmCount} 次`}
              </span>
            </button>
          ))}
        </div>
      )}
    </Panel>
  )
}

/** 地图顶部的园区汇总 */
export function KpiBar({
  total,
  online,
  alarms,
  left,
  top,
}: {
  total: number
  online: number
  alarms: { count: number; capped: boolean } | undefined
  left: number
  top: number
}) {
  const rate = total ? (online / total) * 100 : 0
  const cell = 'border-[rgb(34_211_238/0.15)] border-r border-solid px-6 py-2.5 text-center'
  return (
    <div
      className="absolute flex -translate-x-1/2 items-stretch rounded-md border border-[rgb(34_211_238/0.25)] border-solid bg-[var(--sc-panel)] backdrop-blur-sm"
      style={{ left, top }}
    >
      <div className={cell}>
        <div className="text-[12px] text-[var(--sc-text-2)]">设备总数</div>
        <div className="screen-num font-bold text-[30px] leading-tight">{total}</div>
      </div>
      <div className={cell}>
        <div className="text-[12px] text-[var(--sc-text-2)]">● 在线</div>
        <div className="screen-num font-bold text-[#22d3ee] text-[30px] leading-tight">{online}</div>
      </div>
      <div className={cell}>
        <div className="text-[12px] text-[var(--sc-text-2)]">○ 离线</div>
        <div className="screen-num font-bold text-[#cbd5e1] text-[30px] leading-tight">{total - online}</div>
      </div>
      <div className={cell}>
        <div className="text-[12px] text-[var(--sc-text-2)]">⚠ 未处理告警</div>
        <div className="screen-num font-bold text-[#f87171] text-[30px] leading-tight">{countText(alarms)}</div>
      </div>
      <div className="flex min-w-[150px] flex-col justify-center gap-1.5 px-6 py-2.5">
        <div className="flex justify-between text-[12px] text-[var(--sc-text-2)]">
          <span>在线率</span>
          <span className="screen-num font-semibold text-[18px] text-white">{total ? `${rate.toFixed(1)}%` : '—'}</span>
        </div>
        <div className="h-1.5 rounded-sm bg-[rgb(148_163_184/0.25)]">
          <div className="h-1.5 rounded-sm bg-[#22d3ee]" style={{ width: `${rate}%` }} />
        </div>
      </div>
    </div>
  )
}
