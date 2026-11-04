import type { AppDevice } from '@shared/api/device'
import { controlRelay, interpretControl, relayLinksKey, relayLinksQuery, releaseRelayHold } from '@shared/api/relay'
import { handleGlobalError } from '@shared/queryClient'
import { linkageActionText, linkageTriggerText } from '@shared/relay/linkage'
import { autoControlText, nextActionText, scheduleText } from '@shared/relay/schedule'
import { byChannel, channelName, type Realtime, relayBlockedReason } from '@shared/telemetry/lib/realtime'
import { realtimeKey, realtimeQuery } from '@shared/telemetry/realtime/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from 'antd-mobile'
import { useEffect, useRef, useState } from 'react'
import { useCompanyId } from '@/hooks/session'
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
    links = useQuery(relayLinksQuery(cid, device.id)),
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
  const blocked =
    (realtimeError
      ? '实时状态获取失败，请刷新后控制'
      : device.onlineKnown === false
        ? '在线状态未知，暂不能控制'
        : relayBlockedReason(device, realtime?.online ?? device.online)) || denied
  const toggle = async (channel: number, next: 0 | 1) => {
    if (blocked || busyRef.current.has(channel) || !links.data) return
    busyRef.current.add(channel)
    setBusy(new Set(busyRef.current))
    try {
      const link = links.data.find((l) => l.channel === channel),
        takeover = !!link && !link.hold && !!autoControlText(link)
      if (
        (next === 1 || takeover) &&
        !(await Dialog.confirm({
          title: takeover ? `接管并${next ? '开启' : '关闭'}？` : '开启设备？',
          content:
            takeover && link
              ? `此通道受${autoControlText(link)}控制。接管后联动与定时暂停，直至恢复自动。`
              : '命令立即下发，以设备回报为准。',
          confirmText: takeover ? `接管并${next ? '开启' : '关闭'}` : '开启',
          cancelText: '取消',
        }))
      )
        return
      if (!alive.current) return
      const result = await controlRelay(cid, device.id, channel, next, takeover),
        outcome = interpretControl({ ok: true, data: result })
      const actualState = outcome.actualState
      if (actualState != null)
        qc.setQueryData<Realtime>(realtimeKey(cid, device.id), (old) => {
          if (!old) return old
          const relays = [...(old.relays ?? [])]
          relays[channel] = actualState
          return { ...old, relays }
        })
      if (alive.current)
        Toast.show({
          content: outcome.level === 'success' ? `设备已确认${next ? '开启' : '关闭'}` : outcome.message,
          icon: outcome.level === 'success' ? 'success' : undefined,
        })
      if (outcome.refresh) void qc.invalidateQueries({ queryKey: realtimeKey(cid, device.id) })
      if (outcome.refreshAgain && alive.current)
        timers.current.push(
          setTimeout(() => {
            void qc.invalidateQueries({ queryKey: realtimeKey(cid, device.id) })
          }, 5000),
        )
    } catch (error) {
      const outcome = interpretControl({ ok: false, error })
      if (outcome.lockAll && alive.current) setDenied(outcome.message)
      if (outcome.global) handleGlobalError(error)
      else if (alive.current) Toast.show({ content: outcome.message })
      if (outcome.refresh) void qc.invalidateQueries({ queryKey: realtimeKey(cid, device.id) })
    } finally {
      busyRef.current.delete(channel)
      if (alive.current) setBusy(new Set(busyRef.current))
      void qc.invalidateQueries({ queryKey: relayLinksKey(cid, device.id) })
      void qc.invalidateQueries({ queryKey: ['app', cid, 'operations'] })
      void qc.invalidateQueries({ queryKey: ['app', cid, 'devices'] })
    }
  }
  const release = async (channel: number) => {
    if (blocked || busyRef.current.has(channel)) return
    busyRef.current.add(channel)
    setBusy(new Set(busyRef.current))
    try {
      if (
        !(await Dialog.confirm({
          title: '恢复自动控制？',
          content: '解除手动接管，恢复联动与定时；不会直接改变当前开关状态。',
        }))
      )
        return
      if (!alive.current) return
      const r = await releaseRelayHold(cid, device.id, channel)
      if (alive.current) Toast.show({ content: r.released ? '已恢复自动控制' : '当前未处于接管状态' })
    } catch (e) {
      showFailure(e)
    } finally {
      busyRef.current.delete(channel)
      if (alive.current) setBusy(new Set(busyRef.current))
      void qc.invalidateQueries({ queryKey: relayLinksKey(cid, device.id) })
      void qc.invalidateQueries({ queryKey: ['app', cid, 'operations'] })
    }
  }
  return (
    <Card
      title="继电器控制"
      extra={
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
          刷新状态
        </Button>
      }
    >
      {links.isError && (
        <Failure
          error={links.error}
          retry={() => {
            void links.refetch()
          }}
        />
      )}
      {byChannel(device.relays).map((relay) => {
        const channel = relay.channel,
          value = realtime?.relays?.[channel],
          link = links.data?.find((l) => l.channel === channel),
          automatic = link && autoControlText(link),
          isBusy = busy.has(channel),
          disabled = !!blocked || !links.data
        return (
          <section className="h5-relay" key={channel}>
            <div className="h5-row">
              <div>
                <strong>{channelName(relay)}</strong>
                <small className="h5-muted">
                  通道 {channel} · {value === 1 ? '已开启' : value === 0 ? '已关闭' : '状态未知'}
                </small>
              </div>
              <div className="h5-row">
                {value !== 1 && (
                  <Button
                    size="small"
                    color="primary"
                    loading={isBusy}
                    disabled={disabled}
                    onClick={() => toggle(channel, 1)}
                  >
                    开启
                  </Button>
                )}
                {value !== 0 && (
                  <Button size="small" loading={isBusy} disabled={disabled} onClick={() => toggle(channel, 0)}>
                    关闭
                  </Button>
                )}
              </div>
            </div>
            {blocked && <p className="h5-warning">{blocked}</p>}
            {link?.hold ? (
              <>
                <span className="h5-chip">手动接管中</span>
                <small>
                  {link.hold.operatorName || '用户'} · {fmtDateTime(link.hold.at)}
                </small>
                <Button
                  size="small"
                  fill="outline"
                  loading={isBusy}
                  disabled={!!blocked}
                  onClick={() => release(channel)}
                >
                  恢复自动
                </Button>
              </>
            ) : automatic ? (
              <span className="h5-chip">{automatic}</span>
            ) : (
              <span className="h5-muted">手动控制</span>
            )}
            {link && (link.linkages.length > 0 || link.schedules.length > 0) && (
              <details>
                <summary>查看自动规则</summary>
                {link.linkages.map((l) => (
                  <p key={l.ruleId}>
                    {linkageTriggerText(l)} → {linkageActionText(l.state)}
                  </p>
                ))}
                {link.schedules.map((s) => (
                  <p key={s.id}>{scheduleText(s)}</p>
                ))}
                {link.next && <p>下一动作：{nextActionText(link.next)}</p>}
              </details>
            )}
          </section>
        )
      })}
    </Card>
  )
}
