import type { Schemas } from '@/api/client'
import { api, companyHeader } from '@/api/client'

export const HISTORY_POINTS = 2000

export interface HistoryDownload {
  companyId: number
  deviceSn: string
  start: string
  end: string
  points?: number
  signal?: AbortSignal
  onProgress?: (received: number) => void
}

export type HistorySample = Schemas['AppHistorySample']
export type HistorySeries = Map<number, [number, number][]>

function requestParams(o: HistoryDownload) {
  return {
    path: { deviceSn: o.deviceSn },
    header: companyHeader(o.companyId),
  }
}

/** 按时间分桶的曲线。每个桶保留最早的一帧。 */
export async function downloadHistory(o: HistoryDownload): Promise<HistorySample> {
  const { data } = await api.GET('/api/v1/app/devices/{deviceSn}/history', {
    params: {
      ...requestParams(o),
      query: { start: o.start, end: o.end, points: o.points ?? HISTORY_POINTS },
    },
    signal: o.signal,
  })
  if (!data) throw new Error('未收到历史曲线')
  return data
}

export function toSeries(sample: HistorySample): HistorySeries {
  const series: HistorySeries = new Map()
  for (const record of sample.records) {
    record.vals?.forEach((value, channel) => {
      if (typeof value !== 'number' || Number.isNaN(value)) return
      const points = series.get(channel)
      if (points) points.push([record.time, value])
      else series.set(channel, [[record.time, value]])
    })
  }
  return series
}

/** 窗口内用本次明细，窗口外保留第一次的概览，供底部缩略图使用。 */
export function mergeWindow(
  base: [number, number][],
  detail: [number, number][],
  from: number,
  to: number,
): [number, number][] {
  const merged: [number, number][] = []
  for (const point of base) if (point[0] < from) merged.push(point)
  merged.push(...detail)
  for (const point of base) if (point[0] > to) merged.push(point)
  return merged
}

async function readStream(body: ReadableStream<Uint8Array>, onProgress?: (received: number) => void) {
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.byteLength
    onProgress?.(received)
  }
  const bytes = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

/** 流式下载原始历史。响应不以 ]}` 结尾时视为未完成。 */
export async function downloadHistoryExport(o: HistoryDownload): Promise<Uint8Array<ArrayBuffer>> {
  const { data: body } = await api.GET('/api/v1/app/devices/{deviceSn}/history/export', {
    params: { ...requestParams(o), query: { start: o.start, end: o.end } },
    parseAs: 'stream',
    signal: o.signal,
  })
  if (!body) throw new Error('未收到历史数据')
  const bytes = await readStream(body, o.onProgress)
  const text = new TextDecoder().decode(bytes).trimEnd()
  if (!text.endsWith(']}')) throw new Error('历史导出不完整，请缩小时间范围后重试')
  return bytes
}
