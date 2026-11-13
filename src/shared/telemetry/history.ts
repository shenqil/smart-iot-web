import { api, companyHeader } from '@/api/client'

export interface HistoryDownload {
  companyId: number
  deviceSn: string
  /** RFC3339 (业务时区)，含 */
  start: string
  /** RFC3339 (业务时区)，不含 */
  end: string
  signal?: AbortSignal
  /** 已接收字节数 */
  onProgress?: (received: number) => void
}

/**
 * 下载历史原始数据：GET /app/devices/{deviceSn}/history 为流式 JSON，边收边报进度，
 * 返回完整字节交给 Worker 解析 (避免在主线程解析大 JSON)。错误由接口客户端中间件转为 ApiError。
 * 企业管理员必然满足数据端进入条件，且接口只要求设备已授权给本企业 (不要求挂载园区)
 */
export async function downloadHistory(o: HistoryDownload): Promise<Uint8Array<ArrayBuffer>> {
  const { data: body } = await api.GET('/api/v1/app/devices/{deviceSn}/history', {
    params: {
      path: { deviceSn: o.deviceSn },
      query: { start: o.start, end: o.end },
      header: companyHeader(o.companyId),
    },
    parseAs: 'stream',
    signal: o.signal,
  })
  if (!body) return new Uint8Array(0)
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.byteLength
    o.onProgress?.(received)
  }
  const out = new Uint8Array(received)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}
