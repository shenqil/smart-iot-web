/** 后端统一错误体 {code, message, details} 的前端表示 (BUSINESS_DESIGN §3) */
export interface ApiErrorDetail {
  /** 出错位置，如 body.name、query.pageSize、body.members[0].userId */
  location?: string
  message?: string
  value?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ApiErrorDetail[]
  /** 后端 X-Request-ID，用于排查日志 */
  readonly requestId: string | null

  constructor(
    status: number,
    code: string,
    message: string,
    details: ApiErrorDetail[] = [],
    requestId: string | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.requestId = requestId
  }
}

/** 网络错误 / 前端超时 (请求未拿到响应) */
export const NETWORK_ERROR = 'NETWORK_ERROR'

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError

/** 企业上下文被拒绝 (scope 中间件)：需要刷新"我的企业"并引导切换 */
export const COMPANY_DENIED_CODES = new Set([
  'NOT_COMPANY_MEMBER',
  'COMPANY_DISABLED',
  'COMPANY_EXPIRED',
  'COMPANY_ADMIN_REQUIRED',
])

/** 把 422 details 的 location (body.members[0].userId) 转成 antd Form 字段路径 ['members', 0, 'userId'] */
export function toFieldPath(location: string | undefined): (string | number)[] | null {
  if (!location?.startsWith('body.')) return null
  const path: (string | number)[] = []
  for (const part of location.slice('body.'.length).split('.')) {
    const m = /^([^[\]]+)((?:\[\d+\])*)$/.exec(part)
    if (!m) return null
    path.push(m[1])
    for (const idx of m[2].matchAll(/\[(\d+)\]/g)) path.push(Number(idx[1]))
  }
  return path.length ? path : null
}

/** 422 字段错误 → antd form.setFields 参数；无法对应字段的放在 rest */
export function toFormErrors(err: ApiError) {
  const fields: { name: (string | number)[]; errors: string[] }[] = []
  const rest: string[] = []
  for (const d of err.details) {
    const name = toFieldPath(d.location)
    const msg = d.message ?? err.message
    if (name) fields.push({ name, errors: [msg] })
    else rest.push(msg)
  }
  return { fields, rest }
}

/** 展示给用户的错误文案 (5xx / 网络错误附带请求号) */
export function errorText(e: unknown): string {
  if (isApiError(e)) {
    if (e.code === NETWORK_ERROR) return '网络异常，请检查网络后重试'
    if (e.status >= 500) return `${e.message || '服务异常，请稍后重试'}${e.requestId ? ` (请求号 ${e.requestId})` : ''}`
    return e.message
  }
  return e instanceof Error ? e.message : '未知错误'
}
