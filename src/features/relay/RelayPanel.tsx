import { PoweroffOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Empty, Switch, Tooltip } from 'antd'
import { useState } from 'react'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'
import type { AppDevice } from '@/features/device/api'
import { useStandardRelays } from '@/features/dict/api'
import { relayKind } from '@/features/telemetry/lib/channelKind'
import {
  type AppRelay,
  byChannel,
  channelName,
  type Realtime,
  relayBlockedReason,
} from '@/features/telemetry/lib/realtime'
import { realtimeKey } from '@/features/telemetry/realtime/api'
import { RelayGlyph } from '@/features/telemetry/realtime/ChannelGlyph'
import { useCompanyId } from '@/hooks/session'
import { type ControlOutcome, controlRelay, interpretControl } from './api'

export interface RelayPanelProps {
  device: AppDevice
  realtime: Realtime | undefined
  /** grid：没有传感器时铺满整行；list：与传感器并排时的窄列 */
  layout: 'grid' | 'list'
}

/**
 * 继电器控制 (RELAY_CONTROL §4.1)
 * - 开关状态只来自实时数据，不做乐观更新；设备回报的 actualState 直接写入实时数据
 * - 点击后该通道 loading、禁止再次点击，其他通道不受影响；不自动重发
 * - 开启操作二次确认
 */
export function RelayPanel({ device, realtime, layout }: RelayPanelProps) {
  const companyId = useCompanyId()
  const qc = useQueryClient()
  const [busy, setBusy] = useState<ReadonlySet<number>>(new Set())
  const online = realtime?.online ?? device.online
  const blocked = relayBlockedReason(device, online)
  const relays = byChannel(device.relays)
  const key = realtimeKey(companyId, device.id)
  const stdRelays = useStandardRelays().byId
  // 通道配置的图标 › 标准继电器字典的图标 › 按名称匹配的内置图标
  const iconOf = (r: AppRelay) => r.url || (r.standardId != null ? stdRelays.get(r.standardId)?.url : undefined)

  const apply = (ch: number, o: ControlOutcome) => {
    if (o.actualState != null) {
      const actual = o.actualState
      qc.setQueryData<Realtime>(key, (old) => {
        if (!old?.relays) return old
        const next = [...old.relays]
        next[ch] = actual
        return { ...old, relays: next }
      })
    }
    if (o.refresh) qc.invalidateQueries({ queryKey: key })
    if (o.refreshAgain) setTimeout(() => qc.invalidateQueries({ queryKey: key }), 5_000)
    if (o.lockAll) qc.invalidateQueries({ queryKey: ['app', companyId, 'devices', 'site'] })
    qc.invalidateQueries({ queryKey: ['app', companyId, 'operations'] })
  }

  const run = async (relay: AppRelay, state: 0 | 1) => {
    const ch = relay.channelNum
    setBusy((s) => new Set(s).add(ch))
    let outcome: ControlOutcome
    try {
      outcome = interpretControl({ ok: true, data: await controlRelay(companyId, device.id, ch, state) })
    } catch (error) {
      outcome = interpretControl({ ok: false, error })
      if (outcome.global) handleGlobalError(error)
    } finally {
      setBusy((s) => {
        const n = new Set(s)
        n.delete(ch)
        return n
      })
    }
    if (outcome.global) return
    const name = channelName(relay)
    if (outcome.level === 'success') notify.success(`${name}已${state ? '开启' : '关闭'}`)
    else notify[outcome.level](`${name}：${outcome.message}`)
    apply(ch, outcome)
  }

  const toggle = (relay: AppRelay, next: boolean) => {
    if (!next) return run(relay, 0)
    notify.modal()?.confirm({
      title: `开启「${channelName(relay)}」？`,
      content: '命令会立即下发到设备，结果以设备回报为准。',
      okText: '开启',
      cancelText: '取消',
      icon: <PoweroffOutlined className="text-primary" />,
      onOk: () => {
        run(relay, 1)
      },
    })
  }

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
        const state = realtime?.relays?.[r.channelNum]
        const known = state === 0 || state === 1
        const on = state === 1
        const loading = busy.has(r.channelNum)
        const reason = blocked ?? (realtime && !known ? '暂无状态数据' : null)
        const icon = iconOf(r)
        const kind = relayKind(r)
        return (
          <div
            key={r.channelNum}
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
                通道 {r.channelNum}
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
