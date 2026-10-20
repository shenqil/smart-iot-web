import { BIZ_TZ } from '@/lib/time'
import { downloadHistory } from '../history'
import type { ExportChannel } from '../lib/exportData'
import type { ExportMessage, ExportRequest } from '../workers/export.worker'

export type ExportPhase = 'download' | 'parse' | 'write'

export interface ExportProgress {
  phase: ExportPhase
  /** download：已接收字节；write：已写行数 */
  done: number
  /** write：总行数 */
  total: number
}

export interface ExportJob {
  companyId: number
  deviceId: number
  start: string
  end: string
  channels: ExportChannel[]
  info: [string, string][]
  onProgress: (p: ExportProgress) => void
}

export interface ExportResult {
  blob: Blob
  rows: number
}

/**
 * 导出任务：主线程下载 (可显示进度、可取消) → Worker 解析并生成 xlsx。
 * done 结果为 null 表示时间范围内没有数据；cancel 后 done 以 AbortError 结束
 */
export function runExport(job: ExportJob): { done: Promise<ExportResult | null>; cancel: () => void } {
  const ctrl = new AbortController()
  let worker: Worker | null = null
  const abortError = () => new DOMException('已取消', 'AbortError')

  const done = (async () => {
    const bytes = await downloadHistory({
      companyId: job.companyId,
      deviceId: job.deviceId,
      start: job.start,
      end: job.end,
      signal: ctrl.signal,
      onProgress: (received) => job.onProgress({ phase: 'download', done: received, total: 0 }),
    })
    if (ctrl.signal.aborted) throw abortError()
    return new Promise<ExportResult | null>((resolve, reject) => {
      const w = new Worker(new URL('../workers/export.worker.ts', import.meta.url), { type: 'module' })
      worker = w
      const finish = () => {
        w.terminate()
        worker = null
      }
      ctrl.signal.addEventListener('abort', () => {
        finish()
        reject(abortError())
      })
      w.onmessage = (e: MessageEvent<ExportMessage>) => {
        const m = e.data
        if (m.type === 'progress') job.onProgress({ phase: m.phase, done: m.done, total: m.total })
        else if (m.type === 'done') {
          finish()
          resolve({ blob: m.blob, rows: m.rows })
        } else if (m.type === 'empty') {
          finish()
          resolve(null)
        } else {
          finish()
          reject(new Error(`生成 Excel 失败：${m.message}`))
        }
      }
      w.onerror = (e) => {
        finish()
        reject(new Error(`生成 Excel 失败：${e.message || 'Worker 异常'}`))
      }
      const req: ExportRequest = { bytes, channels: job.channels, tz: BIZ_TZ, info: job.info }
      w.postMessage(req, [bytes.buffer])
    })
  })()

  return {
    done,
    cancel: () => {
      ctrl.abort()
      worker?.terminate()
    },
  }
}

/** 触发浏览器下载 */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
