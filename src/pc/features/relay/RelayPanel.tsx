import { ClockCircleOutlined, LockOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Button, Empty, Switch, Tag, Tooltip } from 'antd'
import type { AppDevice } from '@/features/device/api'
import { relayKind } from '@/features/telemetry/lib/channelKind'
import { type AppRelay, byChannel, channelName, type Realtime } from '@/features/telemetry/lib/realtime'
import { RelayGlyph } from '@/features/telemetry/realtime/ChannelGlyph'
import { fmtDateTime } from '@/lib/time'
import type { RelayLink } from './api'
import { linkageActionText, linkageTriggerText } from './linkage'
import { nextActionText, scheduleText } from './schedule'
import { useRelayControl } from './useRelayControl'

/** 联动、定时与接管角标：联动 N / 定时 N (悬停看规则)；手动接管中 + 恢复自动 */
function LinkBadges({ link, onRelease }: { link: RelayLink | undefined; onRelease: () => void }) {
  if (!link) return null
  const n = link.linkages.length
  const schedules = link.schedules
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {n > 0 && (
        <Tooltip
          title={
            <div className="space-y-1">
              <div>受以下告警规则联动控制 (告警时自动执行)：</div>
              {link.linkages.map((l) => (
                <div key={l.ruleId}>
                  · {linkageTriggerText(l)} → {linkageActionText(l.state)}
                  {!l.ruleEnabled && ' (规则已停用)'}
                </div>
              ))}
            </div>
          }
        >
          <Tag color="blue" icon={<ThunderboltOutlined />} className="m-0 cursor-help">
            联动 {n}
          </Tag>
        </Tooltip>
      )}
      {schedules.length > 0 && (
        <Tooltip
          title={
            <div className="space-y-1">
              <div>定时开关：</div>
              {schedules.map((s) => (
                <div key={s.id}>
                  · {scheduleText(s)}
                  {s.remark ? ` (${s.remark})` : ''}
                </div>
              ))}
              {link.next && <div>下一次：{nextActionText(link.next)}</div>}
            </div>
          }
        >
          <Tag color="cyan" icon={<ClockCircleOutlined />} className="m-0 cursor-help">
            定时 {schedules.length}
          </Tag>
        </Tooltip>
      )}
      {link.hold && (
        <>
          <Tooltip title={`${link.hold.operatorName || '—'} 于 ${fmtDateTime(link.hold.at)} 接管，联动与定时暂停`}>
            <Tag color="purple" icon={<LockOutlined />} className="m-0 cursor-help">
              手动接管中
            </Tag>
          </Tooltip>
          <Button type="link" size="small" className="h-auto p-0 text-xs" onClick={onRelease}>
            恢复自动
          </Button>
        </>
      )}
    </div>
  )
}

export interface RelayPanelProps {
  device: AppDevice
  realtime: Realtime | undefined
  /** grid：没有传感器时铺满整行；list：与传感器并排时的窄列 */
  layout: 'grid' | 'list'
}

/** 继电器控制面板 (数据端)；控制逻辑见 useRelayControl */
export function RelayPanel({ device, realtime, layout }: RelayPanelProps) {
  const { busy, blocked, toggle, links, release } = useRelayControl(device, realtime)
  const relays = byChannel(device.relays)
  // 通道配置的图标 › 标准继电器的图标 (服务端已合并) › 按名称匹配的内置图标
  const iconOf = (r: AppRelay) => r.iconUrl || undefined

  if (!relays.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未配置继电器通道" />

  return (
    <div
      className={
        layout === 'grid'
          ? 'grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]'
          : 'flex flex-col gap-2'
      }
    >
      {relays.map((r) => {
        const state = realtime?.relays?.[r.channel]
        const known = state === 0 || state === 1
        const on = state === 1
        const loading = busy.has(r.channel)
        const reason = blocked ?? (realtime && !known ? '暂无状态数据' : null)
        const icon = iconOf(r)
        const kind = relayKind(r)
        return (
          <div
            key={r.channel}
            className={`flex items-center gap-3 rounded-lg border border-solid px-3 py-2.5 transition-colors ${
              on && !blocked ? 'border-primary/40 bg-primary-bg' : 'border-line bg-container'
            }`}
          >
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] transition-colors ${
                on
                  ? 'bg-primary text-white shadow-[0_2px_8px_color-mix(in_srgb,var(--ant-color-primary)_35%,transparent)]'
                  : 'bg-layout text-fg-tertiary'
              }`}
            >
              {icon ? (
                <img
                  src={icon}
                  alt=""
                  className={`size-6 object-contain ${on ? 'brightness-0 invert' : 'opacity-60 grayscale'}`}
                />
              ) : (
                <RelayGlyph
                  kind={kind}
                  className={`size-[22px] ${on && kind === 'fan' ? 'motion-safe:animate-[spin_2.4s_linear_infinite]' : ''}`}
                />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium" title={channelName(r)}>
                {channelName(r)}
              </div>
              <div className="text-fg-tertiary text-xs">
                通道 {r.channel}
                <span className="ml-2">
                  {loading ? (
                    '执行中…'
                  ) : known ? (
                    on ? (
                      <span className="text-primary">运行中</span>
                    ) : (
                      '已关闭'
                    )
                  ) : (
                    '状态未知'
                  )}
                </span>
              </div>
              <LinkBadges link={links.get(r.channel)} onRelease={() => release(r)} />
            </div>
            <Tooltip title={reason}>
              <Switch
                checked={on}
                loading={loading}
                disabled={Boolean(reason) || loading}
                checkedChildren="开"
                unCheckedChildren="关"
                aria-label={`${channelName(r)}开关`}
                onChange={(v) => toggle(r, v)}
              />
            </Tooltip>
          </div>
        )
      })}
    </div>
  )
}
