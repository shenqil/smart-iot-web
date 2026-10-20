import { PoweroffOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { useState } from 'react'
import { handleGlobalError } from '@/app/queryClient'
import type { AppDevice } from '@/features/device/api'
import { type AppRelay, channelName, type Realtime, relayBlockedReason } from '@/features/telemetry/lib/realtime'
import { realtimeKey } from '@/features/telemetry/realtime/api'
import { useCompanyId } from '@/hooks/session'
import { type ControlOutcome, controlRelay, interpretControl } from './api'

/**
 * 继电器控制 (RELAY_CONTROL §4.1)，数据端继电器面板与大屏共用
 * - 开关状态只来自实时数据，不做乐观更新；设备回报的 actualState 直接写入实时数据
 * - 点击后该通道 loading、禁止再次点击，其他通道不受影响；不自动重发
 * - 开启操作二次确认；提示与确认框取最近的 antd <App> (大屏为暗色)
 */
export function useRelayControl(device: AppDevice, realtime: Realtime | undefined) {
  const companyId = useCompanyId()
  const qc = useQueryClient()
  const { message, modal } = App.useApp()
  const [busy, setBusy] = useState<ReadonlySet<number>>(new Set())
  const online = realtime?.online ?? device.online
  const blocked = relayBlockedReason(device, online)
  const key = realtimeKey(companyId, device.id)

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
    if (outcome.level === 'success') message.success(`${name}已${state ? '开启' : '关闭'}`)
    else message[outcome.level](`${name}：${outcome.message}`)
    apply(ch, outcome)
  }

  /** 切换开关：关闭直接下发，开启先确认 */
  const toggle = (relay: AppRelay, next: boolean) => {
    if (!next) return run(relay, 0)
    modal.confirm({
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

  /** 该通道当前状态：on / off / unknown (无状态数据) */
  const stateOf = (relay: AppRelay) => {
    const s = realtime?.relays?.[relay.channelNum]
    return s === 1 ? 'on' : s === 0 ? 'off' : 'unknown'
  }

  return { busy, blocked, toggle, stateOf }
}
