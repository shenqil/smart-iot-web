import type { Schemas } from '@/api/client'
import { decimalsOf, isValidReading } from '@/lib/resolution'
import { channelName } from './realtime'
import { type Cell, EXCEL_MAX_ROWS, type XlsxColumn, type XlsxSheet } from './xlsx'

/** 导出用到的通道字段 (设备详情的传感器、数据端的传感器都满足) */
export interface SensorConfig {
  channel: number
  label?: string
  unit?: string
  resolution?: number
}
export type HistoryRecord = Schemas['DataRecord']

/** 导出的一列 (传感器通道) */
export interface ExportChannel {
  channel: number
  header: string
  decimals: number
}

/** 表头：名称（单位）；无单位时只有名称 */
export const channelHeader = (s: SensorConfig) => {
  const unit = s.unit?.trim()
  return unit ? `${channelName(s)}（${unit}）` : channelName(s)
}

/**
 * 按用户选择的顺序生成导出列；同名表头追加 #通道号 区分
 * channelNums 中不在配置里的通道忽略
 */
export function exportChannels(sensors: SensorConfig[], channelNums: number[]): ExportChannel[] {
  const byNum = new Map(sensors.map((s) => [s.channel, s]))
  const picked = channelNums.flatMap((n) => {
    const s = byNum.get(n)
    return s ? [s] : []
  })
  const count = new Map<string, number>()
  for (const s of picked) count.set(channelHeader(s), (count.get(channelHeader(s)) ?? 0) + 1)
  return picked.map((s) => {
    const h = channelHeader(s)
    return {
      channel: s.channel,
      header: (count.get(h) ?? 0) > 1 ? `${h} #${s.channel}` : h,
      decimals: decimalsOf(s.resolution),
    }
  })
}

/** Unix 毫秒 → Excel 日期序列值 (按业务时区的墙上时间，Excel 不带时区) */
export function excelSerial(ms: number, offsetMinutes: number): number {
  return (ms + offsetMinutes * 60_000) / 86_400_000 + 25_569
}

/** 按小数位四舍五入，避免浮点尾数 (如 25.299999999) */
export function roundTo(v: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/** 一帧 → 一行：首列时间，其余按导出列取值；无读数 (null) 或越界为空 */
export function recordRow(r: HistoryRecord, channels: ExportChannel[], offsetMinutes: number): Cell[] {
  const row: Cell[] = [excelSerial(r.time, offsetMinutes)]
  for (const c of channels) {
    const v = r.vals?.[c.channel]
    row.push(isValidReading(v) ? roundTo(v, c.decimals) : null)
  }
  return row
}

export const TIME_HEADER = '时间'

/** 数据表的列：第一列恒为时间 */
export const dataColumns = (channels: ExportChannel[]): XlsxColumn[] => [
  { header: TIME_HEADER, width: 20, style: { kind: 'datetime' } },
  ...channels.map((c) => ({ header: c.header, style: { kind: 'number' as const, decimals: c.decimals } })),
]

/**
 * 数据工作表：超过 Excel 单表行数上限时拆成多张 (数据 1、数据 2 …)，每张都带表头
 * offsetOf(ms) 返回该时刻业务时区相对 UTC 的分钟数
 */
export function dataSheets(
  records: HistoryRecord[],
  channels: ExportChannel[],
  offsetOf: (ms: number) => number,
  rowsPerSheet = EXCEL_MAX_ROWS - 1,
): XlsxSheet[] {
  const columns = dataColumns(channels)
  const n = Math.max(1, Math.ceil(records.length / rowsPerSheet))
  return Array.from({ length: n }, (_, i) => ({
    name: n === 1 ? '数据' : `数据 ${i + 1}`,
    columns,
    rows: (function* () {
      const end = Math.min(records.length, (i + 1) * rowsPerSheet)
      for (let k = i * rowsPerSheet; k < end; k++) {
        const r = records[k]
        yield recordRow(r, channels, offsetOf(r.time))
      }
    })(),
  }))
}

/** 时区偏移按小时缓存 (逐行计算 tz 太慢；夏令时切换只发生在整点) */
export function cachedOffset(compute: (ms: number) => number): (ms: number) => number {
  const cache = new Map<number, number>()
  return (ms) => {
    const h = Math.floor(ms / 3_600_000)
    let v = cache.get(h)
    if (v === undefined) {
      v = compute(h * 3_600_000)
      cache.set(h, v)
    }
    return v
  }
}

/** 文件名：去掉系统不允许的字符 */
export const safeFileName = (s: string) => s.replace(/[\\/:*?"<>|\s]+/g, '_').replace(/_+/g, '_')
