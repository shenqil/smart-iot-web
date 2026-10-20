/// <reference lib="webworker" />
import { dayjs } from '@/lib/time'
import { cachedOffset, type HistoryRecord } from '../lib/exportData'
import { lowerBound, lttb } from '../lib/lttb'
import { type ColumnarHistory, type CsvColumn, csvLines, toColumnar } from '../lib/series'

/** 主线程 → Worker */
export type HistoryRequest =
  | { type: 'load'; id: number; bytes: Uint8Array<ArrayBuffer>; channels: number[] }
  | { type: 'sample'; id: number; channels: number[]; from?: number; to?: number; points: number }
  | { type: 'csv'; id: number; columns: CsvColumn[]; tz: string }

/** Worker → 主线程 */
export type HistoryResponse =
  | { type: 'loaded'; id: number; count: number; start: number | null; end: number | null }
  | { type: 'sampled'; id: number; series: { channel: number; data: Float64Array }[] }
  | { type: 'csv'; id: number; blob: Blob }
  | { type: 'error'; id: number; message: string }

const scope = self as unknown as DedicatedWorkerGlobalScope
let data: ColumnarHistory | null = null
/** 全范围降采样结果 (缩放时窗口外沿用它，保持底部缩略图形状) */
const overview = new Map<number, Float64Array>()

function sample(channel: number, points: number, from?: number, to?: number): Float64Array {
  if (!data) return new Float64Array(0)
  const ys = data.channels.get(channel)
  if (!ys) return new Float64Array(0)
  const xs = data.times
  let full = overview.get(channel)
  if (!full) {
    full = lttb(xs, ys, points)
    overview.set(channel, full)
  }
  if (from == null || to == null) return full
  const a = lowerBound(xs, from)
  const b = lowerBound(xs, to + 1)
  const detail = lttb(xs, ys, points, a, b)
  // 窗口外取概览点，窗口内取细节点
  const out: number[] = []
  for (let i = 0; i < full.length; i += 2) if (full[i] < from) out.push(full[i], full[i + 1])
  for (let i = 0; i < detail.length; i++) out.push(detail[i])
  for (let i = 0; i < full.length; i += 2) if (full[i] > to) out.push(full[i], full[i + 1])
  return Float64Array.from(out)
}

scope.onmessage = (e: MessageEvent<HistoryRequest>) => {
  const m = e.data
  try {
    if (m.type === 'load') {
      const text = new TextDecoder().decode(m.bytes)
      const records: HistoryRecord[] = text ? ((JSON.parse(text) as { records?: HistoryRecord[] }).records ?? []) : []
      data = toColumnar(records, m.channels)
      overview.clear()
      const n = data.times.length
      scope.postMessage({
        type: 'loaded',
        id: m.id,
        count: n,
        start: n ? data.times[0] : null,
        end: n ? data.times[n - 1] : null,
      } satisfies HistoryResponse)
    } else if (m.type === 'sample') {
      const series = m.channels.map((channel) => ({ channel, data: sample(channel, m.points, m.from, m.to) }))
      scope.postMessage(
        { type: 'sampled', id: m.id, series } satisfies HistoryResponse,
        series.map((s) => s.data.buffer),
      )
    } else {
      if (!data) throw new Error('没有数据')
      const offsetOf = cachedOffset((ms) => dayjs(ms).tz(m.tz).utcOffset())
      const parts: string[] = ['﻿']
      for (const line of csvLines(data, m.columns, offsetOf)) parts.push(line, '\r\n')
      scope.postMessage({
        type: 'csv',
        id: m.id,
        blob: new Blob(parts, { type: 'text/csv;charset=utf-8' }),
      } satisfies HistoryResponse)
    }
  } catch (err) {
    scope.postMessage({
      type: 'error',
      id: m.id,
      message: err instanceof Error ? err.message : String(err),
    } satisfies HistoryResponse)
  }
}
