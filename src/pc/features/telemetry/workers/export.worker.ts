/// <reference lib="webworker" />
import { dayjs } from '@/lib/time'
import { cachedOffset, dataSheets, type ExportChannel, type HistoryRecord } from '../lib/exportData'
import { buildXlsx, type XlsxSheet } from '../lib/xlsx'

/** 主线程 → Worker */
export interface ExportRequest {
  bytes: Uint8Array<ArrayBuffer>
  channels: ExportChannel[]
  tz: string
  /** 写入"导出信息"工作表的键值 */
  info: [string, string][]
}

/** Worker → 主线程 */
export type ExportMessage =
  | { type: 'progress'; phase: 'parse' | 'write'; done: number; total: number }
  | { type: 'done'; blob: Blob; rows: number }
  | { type: 'empty' }
  | { type: 'error'; message: string }

const post = (m: ExportMessage) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m)

/** 解析历史 JSON → 生成 xlsx (数据表 + 导出信息)，全程在 Worker 内，不阻塞页面 */
self.onmessage = async (e: MessageEvent<ExportRequest>) => {
  try {
    const { bytes, channels, tz, info } = e.data
    post({ type: 'progress', phase: 'parse', done: 0, total: 0 })
    const text = new TextDecoder().decode(bytes)
    const records: HistoryRecord[] = text ? ((JSON.parse(text) as { records?: HistoryRecord[] }).records ?? []) : []
    if (!records.length) return post({ type: 'empty' })

    const offsetOf = cachedOffset((ms) => dayjs(ms).tz(tz).utcOffset())
    const sheets: XlsxSheet[] = [
      ...dataSheets(records, channels, offsetOf),
      {
        name: '导出信息',
        freeze: false,
        columns: [
          { header: '项目', width: 14, style: { kind: 'text' } },
          { header: '内容', width: 60, style: { kind: 'text' } },
        ],
        rows: [...info, ['数据行数', String(records.length)]],
      },
    ]
    const total = records.length
    let done = 0
    const blob = await buildXlsx(sheets, () => {
      done++
      if (done % 5000 === 0 && done <= total) post({ type: 'progress', phase: 'write', done, total })
    })
    post({ type: 'done', blob, rows: total })
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
