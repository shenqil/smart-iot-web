import { ClockCircleOutlined, LockOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { AppDevice } from '@shared/api/device'
import {
  type ControlOutcome,
  controlRelay,
  interpretControl,
  type RelayLink,
  relayLinksKey,
  relayLinksQuery,
  releaseRelayHold,
} from '@shared/api/relay'
import { handleGlobalError } from '@shared/queryClient'
import { linkageActionText, linkageTriggerText } from '@shared/relay/linkage'
import { autoControlText, nextActionText, scheduleText } from '@shared/relay/schedule'
import { relayKind } from '@shared/telemetry/lib/channelKind'
import {
  type AppRelay,
  agoText,
  byChannel,
  channelName,
  type Realtime,
  relayBlockedReason,
} from '@shared/telemetry/lib/realtime'
import { realtimeKey, realtimeQuery } from '@shared/telemetry/realtime/api'
import { RelayGlyph } from '@shared/telemetry/realtime/ChannelGlyph'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Switch } from 'antd-mobile'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useCompanyId } from '@/hooks/session'
import { useNow } from '@/hooks/useNow'
import { fmtDateTime } from '@/lib/time'
import { mobileDeviceQuery } from '../api'
import { Card, mobileDialog as Dialog, Failure, showFailure, mobileToast as Toast } from '../ui'

export default function MobileRelayPanel({
  device,
  realtime,
  realtimeError = false,
}: {
  device: AppDevice
  realtime?: Realtime
  realtimeError?: boolean
}) {
  const cid = useCompanyId(),
    qc = useQueryClient(),
    now = useNow(10_000),
    linksQuery = useQuery({ ...relayLinksQuery(cid, device.id), enabled: device.relays.length > 0 }),
    [denied, setDenied] = useState(''),
    [busy, setBusy] = useState<ReadonlySet<number>>(new Set()),
    busyRef = useRef(new Set<number>()),
    alive = useRef(true),
    timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      timers.current.forEach(clearTimeout)
    }
  }, [])

  const links = useMemo(
    () => new Map<number, RelayLink>((linksQuery.data ?? []).map((l) => [l.channel, l])),
    [linksQuery.data],
  )

  const blocked =
    (realtimeError
      ? '实时状态获取失败，请刷新后控制'
      : device.onlineKnown === false
        ? '在线状态未知，暂不能控制'
        : relayBlockedReason(device, realtime?.online ?? device.online)) || denied

  const relays = byChannel(device.relays)

  const showLinkageRules = (relay: AppRelay, link: RelayLink) => {
    Dialog.alert({
      title: `${channelName(relay)} · 联动规则`,
      content: (
        <div className="space-y-1.5 text-left text-xs">
          <div>受以下告警规则联动控制 (告警时自动执行)：</div>
          {link.linkages.map((l) => (
            <div key={l.ruleId}>
              · {linkageTriggerText(l)} → {linkageActionText(l.state)}
              {!l.ruleEnabled && ' (规则已停用)'}
            </div>
          ))}
        </div>
      ),
    })
  }

  const showScheduleRules = (relay: AppRelay, link: RelayLink) => {
    Dialog.alert({
      title: `${channelName(relay)} · 定时规则`,
      content: (
        <div className="space-y-1.5 text-left text-xs">
          <div>定时开关：</div>
          {link.schedules.map((s) => (
            <div key={s.id}>
              · {scheduleText(s)}
              {s.remark ? ` (${s.remark})` : ''}
            </div>
          ))}
          {link.next && <div>下一次：{nextActionText(link.next)}</div>}
        </div>
      ),
    })
  }

  const run = async (relay: AppRelay, state: 0 | 1, takeover = false) => {
    const ch = relay.channel
    let outcome: ControlOutcome
    try {
      outcome = interpretControl({ ok: true, data: await controlRelay(cid, device.id, ch, state, takeover) })
    } catch (error) {
      outcome = interpretControl({ ok: false, error })
      if (outcome.lockAll && alive.current) setDenied(outcome.message)
      if (outcome.global) handleGlobalError(error)
    } finally {
      busyRef.current.delete(ch)
      if (alive.current) setBusy(new Set(busyRef.current))
    }

    if (takeover) void qc.invalidateQueries({ queryKey: relayLinksKey(cid, device.id) })
    if (outcome.global) return

    const name = channelName(relay)
    if (alive.current) {
      Toast.show({
        content: outcome.level === 'success' ? `${name}已${state ? '开启' : '关闭'}` : outcome.message,
        icon: outcome.level === 'success' ? 'success' : undefined,
      })
    }

    const actual = outcome.actualState
    if (actual != null) {
      qc.setQueryData<Realtime>(realtimeKey(cid, device.id), (old) => {
        if (!old) return old
        const nextRelays = [...(old.relays ?? [])]
        nextRelays[ch] = actual
        return { ...old, relays: nextRelays }
      })
    }
    if (outcome.refresh) void qc.invalidateQueries({ queryKey: realtimeKey(cid, device.id) })
    if (outcome.refreshAgain && alive.current) {
      timers.current.push(
        setTimeout(() => {
          void qc.invalidateQueries({ queryKey: realtimeKey(cid, device.id) })
        }, 5_000),
      )
    }
    void qc.invalidateQueries({ queryKey: ['app', cid, 'operations'] })
    void qc.invalidateQueries({ queryKey: ['app', cid, 'devices'] })
  }

  const toggle = async (relay: AppRelay, next: 0 | 1) => {
    const ch = relay.channel
    if (blocked || busyRef.current.has(ch) || !linksQuery.data) return

    busyRef.current.add(ch)
    setBusy(new Set(busyRef.current))

    const link = links.get(ch)
    const takeover = Boolean(link && !link.hold && autoControlText(link))

    if (takeover && link) {
      const ok = await Dialog.confirm({
        title: `手动${next ? '开启' : '关闭'}「${channelName(relay)}」？`,
        content: `该继电器受${autoControlText(link)}自动控制。手动操作后将接管自动控制 (联动与定时暂停，期间定时执行记为失败)，直到点击"恢复自动"。`,
        confirmText: `接管并${next ? '开启' : '关闭'}`,
        cancelText: '取消',
      })
      if (!ok) {
        busyRef.current.delete(ch)
        if (alive.current) setBusy(new Set(busyRef.current))
        return
      }
      if (!alive.current) return
      return run(relay, next, true)
    }

    if (!next) {
      // 关闭操作直接下发 (与 PC 逻辑一致：关闭直接下发，开启先确认)
      return run(relay, 0, false)
    }

    // 开启操作二次确认 (与 PC 逻辑一致)
    const ok = await Dialog.confirm({
      title: `开启「${channelName(relay)}」？`,
      content: '请确保现场安全与设备状态正常。命令下发后以设备回报为准。',
      confirmText: '开启',
      cancelText: '取消',
    })
    if (!ok) {
      busyRef.current.delete(ch)
      if (alive.current) setBusy(new Set(busyRef.current))
      return
    }
    if (!alive.current) return
    return run(relay, 1, false)
  }

  const release = async (relay: AppRelay) => {
    const ch = relay.channel
    if (blocked || busyRef.current.has(ch)) return
    busyRef.current.add(ch)
    setBusy(new Set(busyRef.current))
    try {
      const ok = await Dialog.confirm({
        title: '恢复自动控制？',
        content: '解除手动接管，恢复联动与定时；不会直接改变当前开关状态。',
        confirmText: '恢复自动',
        cancelText: '取消',
      })
      if (!ok) return
      if (!alive.current) return
      const r = await releaseRelayHold(cid, device.id, ch)
      if (alive.current) Toast.show({ content: r.released ? '已恢复自动控制' : '当前未处于接管状态' })
    } catch (e) {
      showFailure(e)
    } finally {
      busyRef.current.delete(ch)
      if (alive.current) setBusy(new Set(busyRef.current))
      void qc.invalidateQueries({ queryKey: relayLinksKey(cid, device.id) })
      void qc.invalidateQueries({ queryKey: ['app', cid, 'operations'] })
    }
  }

  return (
    <Card
      title={
        <span className="flex items-center gap-1.5">
          继电器控制
          <span className="text-xs font-normal text-muted">{relays.length} 路</span>
        </span>
      }
      extra={
        <div className="flex items-center gap-2">
          {realtime?.relaysAt && (
            <span className="text-xs text-muted" title={fmtDateTime(realtime.relaysAt)}>
              更新于 {agoText(realtime.relaysAt, now)}
            </span>
          )}
          <Button
            size="mini"
            fill="none"
            onClick={async () => {
              try {
                await Promise.all([
                  qc.fetchQuery({ ...mobileDeviceQuery(cid, device.id), staleTime: 0 }),
                  qc.fetchQuery({ ...realtimeQuery(cid, device.id), staleTime: 0 }),
                  qc.invalidateQueries({ queryKey: relayLinksKey(cid, device.id) }),
                ])
                if (alive.current) setDenied('')
              } catch (e) {
                showFailure(e)
              }
            }}
          >
            刷新
          </Button>
        </div>
      }
    >
      {linksQuery.isError && (
        <Failure
          error={linksQuery.error}
          retry={() => {
            void linksQuery.refetch()
          }}
        />
      )}
      {blocked && <p className="mb-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">{blocked}</p>}
      <div className="flex flex-col gap-2.5">
        {relays.map((relay) => {
          const channel = relay.channel,
            value = realtime?.relays?.[channel],
            known = value === 0 || value === 1,
            on = value === 1,
            link = links.get(channel),
            isBusy = busy.has(channel),
            disabled = Boolean(blocked) || !linksQuery.data || isBusy,
            icon = relay.iconUrl || undefined,
            kind = relayKind(relay)

          return (
            <div
              key={channel}
              className={`flex items-center gap-3 rounded-xl border border-solid p-3 transition-colors ${
                on && !blocked ? 'border-[#16765f]/30 bg-[#16765f]/5' : 'border-[#e3ebe3] bg-white'
              }`}
            >
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  on
                    ? 'bg-[var(--h5-primary,#16765f)] text-white shadow-[0_2px_8px_rgba(22,118,95,0.3)]'
                    : 'bg-[#edf2ee] text-[#799183]'
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
                    className={`size-5.5 ${on && kind === 'fan' ? 'motion-safe:animate-[spin_2.4s_linear_infinite]' : ''}`}
                  />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[var(--h5-text,#233d31)]" title={channelName(relay)}>
                  {channelName(relay)}
                </div>
                <div className="mt-0.5 text-xs text-[var(--h5-muted,#63786d)]">
                  <span>
                    通道 {channel} ·{' '}
                    {known ? (
                      on ? (
                        <span className="font-medium text-[var(--h5-primary,#16765f)]">运行中</span>
                      ) : (
                        '已关闭'
                      )
                    ) : (
                      '状态未知'
                    )}
                  </span>
                  {isBusy && <span className="ml-1.5 text-amber-600">执行中…</span>}
                </div>

                {/* 联动与定时角标 */}
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {link && link.linkages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => showLinkageRules(relay, link)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700"
                    >
                      <ThunderboltOutlined className="text-[10px]" /> 联动 {link.linkages.length}
                    </button>
                  )}
                  {link && link.schedules.length > 0 && (
                    <button
                      type="button"
                      onClick={() => showScheduleRules(relay, link)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded bg-cyan-50 px-1.5 py-0.5 text-[11px] font-medium text-cyan-700"
                    >
                      <ClockCircleOutlined className="text-[10px]" /> 定时 {link.schedules.length}
                    </button>
                  )}
                  {link?.hold && (
                    <div className="inline-flex items-center gap-1">
                      <span
                        className="inline-flex items-center gap-1 rounded bg-purple-50 px-1.5 py-0.5 text-[11px] font-medium text-purple-700"
                        title={`${link.hold.operatorName || '—'} 于 ${fmtDateTime(link.hold.at)} 接管`}
                      >
                        <LockOutlined className="text-[10px]" /> 手动接管中
                      </span>
                      <button
                        type="button"
                        className="cursor-pointer text-[11px] text-[var(--h5-primary,#16765f)] underline"
                        disabled={disabled}
                        onClick={() => release(relay)}
                      >
                        恢复自动
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <Switch
                checked={on}
                loading={isBusy}
                disabled={disabled}
                checkedText="开"
                uncheckedText="关"
                aria-label={`${channelName(relay)}开关`}
                onChange={(checked) => toggle(relay, checked ? 1 : 0)}
              />
            </div>
          )
        })}
      </div>
    </Card>
  )
}
