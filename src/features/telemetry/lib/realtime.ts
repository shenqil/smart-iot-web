import type { Schemas } from '@/api/client'
import { decimalsOf, INVALID_READING } from '@/lib/resolution'
import { dayjs } from '@/lib/time'

export type AppSensor = Schemas['DeviceAppSensor']
export type AppRelay = Schemas['RelayConfig']
export type Realtime = Schemas['TelemetryRealtimeView']

/** 通道显示名：显示名 > 标准名 > 通道 N (传感器、继电器通用) */
export const channelName = (c: { displayName?: string; standardName?: string; channelNum: number }) =>
  c.displayName?.trim() || c.standardName?.trim() || `通道 ${c.channelNum}`

/** 按通道号排序 (配置数组不保证有序) */
export const byChannel = <T extends { channelNum: number }>(list: T[] | null | undefined): T[] =>
  [...(list ?? [])].sort((a, b) => a.channelNum - b.channelNum)

/**
 * 读数状态
 * - ok 正常；over / under 超出量程 (数据端拿不到告警规则，只按量程判断)
 * - invalid 该通道无读数 (2147483647，无传感器)；empty 设备还没有上报数据
 */
export type ReadingState = 'ok' | 'over' | 'under' | 'invalid' | 'empty'

export interface SensorReading {
  config: AppSensor
  name: string
  value: number | null
  /** 按分辨率格式化后的值 (不含单位) */
  text: string
  state: ReadingState
  /** 值在量程中的位置 0~1 (量程未配置时为 null)，超量程时夹在两端 */
  position: number | null
}

/** 实时数组 + 通道配置 → 卡片数据 (下标即通道号) */
export function readSensor(config: AppSensor, sensors: readonly number[] | null | undefined): SensorReading {
  const name = channelName(config)
  const raw = sensors?.[config.channelNum]
  if (raw == null || Number.isNaN(raw)) return { config, name, value: null, text: '—', state: 'empty', position: null }
  if (raw === INVALID_READING) return { config, name, value: null, text: '无读数', state: 'invalid', position: null }
  const { minValue: min, maxValue: max } = config
  let state: ReadingState = 'ok'
  if (max != null && raw > max) state = 'over'
  else if (min != null && raw < min) state = 'under'
  const position = min != null && max != null && max > min ? Math.min(1, Math.max(0, (raw - min) / (max - min))) : null
  // 避免 -0.4 → "-0"
  const text = raw.toFixed(decimalsOf(config.resolution)).replace(/^-(0(\.0+)?)$/, '$1')
  return { config, name, value: raw, text, state, position }
}

/** 设备类型是否为视频监控 (只展示视频，按字典名称判断) */
export const isVideoDeviceType = (typeName: string | null | undefined) =>
  Boolean(typeName && /视频|摄像/.test(typeName))

/** 继电器不可操作的原因 (已确认决策 #8：已配置 + 在线 + 设备启用)；可操作时返回 null */
export function relayBlockedReason(device: { status: string }, online: boolean): string | null {
  if (device.status === 'inactive') return '设备已停用'
  if (device.status === 'fault') return '设备已损坏'
  if (!online) return '设备离线'
  return null
}

/** 操作记录的展示状态：超过 1 分钟仍为 pending 视为超时 (RELAY_CONTROL §4.1) */
export function opDisplayStatus(r: { status: string; createdAt: string }, now = Date.now()) {
  if (r.status === 'pending' && now - dayjs(r.createdAt).valueOf() > 60_000) return 'timeout'
  return r.status
}

/** "8 秒前" / "3 分钟前" / "2 小时前" / 日期时间 */
export function agoText(at: string | null | undefined, now = Date.now()): string {
  if (!at) return '—'
  const sec = Math.max(0, Math.round((now - dayjs(at).valueOf()) / 1000))
  if (sec < 60) return `${sec} 秒前`
  if (sec < 3600) return `${Math.floor(sec / 60)} 分钟前`
  if (sec < 86400) return `${Math.floor(sec / 3600)} 小时前`
  return dayjs(at).format('MM-DD HH:mm')
}
