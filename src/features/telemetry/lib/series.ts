import { isValidReading } from '@/lib/resolution'
import type { HistoryRecord } from './exportData'
import { roundTo } from './exportData'

/** 历史数据的列式存储：times 升序；每个通道一列，无读数为 NaN */
export interface ColumnarHistory {
  times: Float64Array
  channels: Map<number, Float64Array>
}

/** 记录数组 → 列式 (只保留需要的通道) */
export function toColumnar(records: HistoryRecord[], channelNums: number[]): ColumnarHistory {
  const n = records.length
  const times = new Float64Array(n)
  const channels = new Map(channelNums.map((c) => [c, new Float64Array(n)]))
  for (let i = 0; i < n; i++) {
    const r = records[i]
    times[i] = r.time
    for (const [c, col] of channels) {
      const v = r.vals?.[c]
      col[i] = isValidReading(v) ? v : Number.NaN
    }
  }
  return { times, channels }
}

/**
 * 业务时区墙上时间 "YYYY-MM-DD HH:mm:ss"
 * offsetOf(ms) 返回该时刻相对 UTC 的分钟数 (配合 cachedOffset 避免逐行计算时区)
 */
export function wallTime(ms: number, offsetMinutes: number): string {
  const s = new Date(ms + offsetMinutes * 60_000).toISOString()
  return `${s.slice(0, 10)} ${s.slice(11, 19)}`
}

/** CSV 字段转义 */
export const csvField = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)

export interface CsvColumn {
  channelNum: number
  header: string
  decimals: number
}

/** 生成 CSV 文本行 (首列时间)；无读数为空 */
export function* csvLines(
  h: ColumnarHistory,
  columns: CsvColumn[],
  offsetOf: (ms: number) => number,
): Generator<string> {
  yield ['时间', ...columns.map((c) => c.header)].map(csvField).join(',')
  const cols = columns.map((c) => ({ ...c, data: h.channels.get(c.channelNum) }))
  for (let i = 0; i < h.times.length; i++) {
    const t = h.times[i]
    let line = wallTime(t, offsetOf(t))
    for (const c of cols) {
      const v = c.data?.[i]
      line += `,${v == null || Number.isNaN(v) ? '' : roundTo(v, c.decimals)}`
    }
    yield line
  }
}
