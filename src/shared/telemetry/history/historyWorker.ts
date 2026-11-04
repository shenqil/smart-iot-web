import type { HistoryRequest, HistoryResponse } from '../workers/history.worker'

type Pending = { resolve: (r: HistoryResponse) => void; reject: (e: unknown) => void }
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** 历史数据 Worker 的请求 / 响应封装：每个请求带 id；一个面板一个 Worker，卸载时 terminate */
export class HistoryWorker {
  private worker = new Worker(new URL('../workers/history.worker.ts', import.meta.url), { type: 'module' })
  private seq = 0
  private pending = new Map<number, Pending>()

  constructor() {
    this.worker.onmessage = (e: MessageEvent<HistoryResponse>) => {
      const p = this.pending.get(e.data.id)
      if (!p) return
      this.pending.delete(e.data.id)
      if (e.data.type === 'error') p.reject(new Error(e.data.message))
      else p.resolve(e.data)
    }
    this.worker.onerror = (e) => {
      for (const p of this.pending.values()) p.reject(new Error(e.message || '数据处理失败'))
      this.pending.clear()
    }
  }

  private call<T extends HistoryResponse['type']>(
    req: DistributiveOmit<HistoryRequest, 'id'>,
    transfer: Transferable[] = [],
  ): Promise<Extract<HistoryResponse, { type: T }>> {
    const id = ++this.seq
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as Pending['resolve'], reject })
      this.worker.postMessage({ ...req, id }, transfer)
    })
  }

  /** 解析下载的 JSON 字节 (所有权转移给 Worker) */
  load(bytes: Uint8Array<ArrayBuffer>, channels: number[]) {
    return this.call<'loaded'>({ type: 'load', bytes, channels }, [bytes.buffer])
  }

  /** 降采样；from / to 为缩放窗口 (毫秒)，不传为全范围 */
  sample(channels: number[], points: number, from?: number, to?: number) {
    return this.call<'sampled'>({ type: 'sample', channels, points, from, to })
  }

  csv(columns: Extract<HistoryRequest, { type: 'csv' }>['columns'], tz: string) {
    return this.call<'csv'>({ type: 'csv', columns, tz })
  }

  terminate() {
    this.worker.terminate()
    for (const p of this.pending.values()) p.reject(new DOMException('已取消', 'AbortError'))
    this.pending.clear()
  }
}
