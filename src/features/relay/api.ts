import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api, companyHeader, type Schemas, unwrap } from '@/api/client'
import { COMPANY_DENIED_CODES, errorText, isApiError, NETWORK_ERROR } from '@/api/errors'

export type RelayOp = Schemas['RelayRecordView']
/** 控制某一路继电器的一条告警规则 (触发设备的规则 -> 本设备的一路继电器) */
export type RelayLinkage = Schemas['LinkageView']
/** 一路继电器的定时规则、下一次定时动作与手动接管状态 */
export type RelayAutomation = Schemas['RelayAutomation']

/** 继电器面板中一路继电器的自动控制：联动 (告警规则) + 定时 + 手动接管 */
export interface RelayLink {
  channel: number
  linkages: RelayLinkage[]
  schedules: RelayAutomation['schedules']
  next: RelayAutomation['next'] | null
  hold: RelayAutomation['hold'] | null
}

/** 联动与定时 / 接管按通道合并 (只保留有自动控制或已接管的通道) */
export function mergeRelayLinks(automation: RelayAutomation[], linkages: RelayLinkage[]): RelayLink[] {
  const out = new Map<number, RelayLink>()
  const of = (channel: number) => {
    let l = out.get(channel)
    if (!l) {
      l = { channel, linkages: [], schedules: [], next: null, hold: null }
      out.set(channel, l)
    }
    return l
  }
  for (const a of automation) {
    if (!a.schedules?.length && !a.hold) continue
    Object.assign(of(a.channel), { schedules: a.schedules ?? [], next: a.next ?? null, hold: a.hold ?? null })
  }
  for (const v of linkages) of(v.channel).linkages.push(v)
  return [...out.values()].sort((a, b) => a.channel - b.channel)
}

export interface OperationQuery {
  siteId?: number
  deviceId?: number
  source?: 'manual' | 'linkage' | 'schedule' | 'hold' | 'release'
  status?: 'pending' | 'success' | 'timeout' | 'failed'
  start?: string
  end?: string
  keyword?: string
  sort?: string
  page: number
  pageSize: number
}

/** 继电器操作记录 (不返回总数，hasMore 决定能否翻下一页) */
export const operationsQuery = (companyId: number, q: OperationQuery) =>
  queryOptions({
    queryKey: ['app', companyId, 'operations', 'list', q],
    queryFn: ({ signal }) =>
      unwrap(api.GET('/api/v1/app/operations', { params: { header: companyHeader(companyId), query: q }, signal })),
    placeholderData: keepPreviousData,
  })

/** 前端超时 10s；任何情况都不自动重发 (RELAY_CONTROL §4.1) */
export const RELAY_TIMEOUT_MS = 10_000

/** 控制继电器；takeover 为 true 时同时进入手动接管 (联动与定时暂停，直到恢复自动) */
export function controlRelay(companyId: number, deviceId: number, channel: number, state: 0 | 1, takeover = false) {
  return unwrap(
    api.POST('/api/v1/app/devices/{id}/relays/{channel}', {
      params: { path: { id: deviceId, channel }, header: companyHeader(companyId) },
      body: takeover ? { state, takeover } : { state },
      signal: AbortSignal.timeout(RELAY_TIMEOUT_MS),
    }),
  )
}

/** 继电器联动与手动接管状态 (打开页面时查询，不随实时数据轮询) */
export const relayLinksKey = (companyId: number, deviceId: number) =>
  ['app', companyId, 'relay-links', deviceId] as const

export const relayLinksQuery = (companyId: number, deviceId: number) =>
  queryOptions({
    queryKey: relayLinksKey(companyId, deviceId),
    queryFn: async ({ signal }) => {
      const params = { path: { id: deviceId }, header: companyHeader(companyId) }
      const [automation, linkages] = await Promise.all([
        unwrap(api.GET('/api/v1/app/devices/{id}/relays/automation', { params, signal })),
        unwrap(api.GET('/api/v1/app/devices/{id}/relays/linkages', { params, signal })),
      ])
      return mergeRelayLinks(automation ?? [], linkages ?? [])
    },
    staleTime: 60_000,
  })

/** 恢复自动控制 (解除手动接管) */
export function releaseRelayHold(companyId: number, deviceId: number, channel: number) {
  return unwrap(
    api.DELETE('/api/v1/app/devices/{id}/relays/{channel}/hold', {
      params: { path: { id: deviceId, channel }, header: companyHeader(companyId) },
    }),
  )
}

/**
 * 控制结果的界面处理
 * - actualState：设备回报的状态，非空时直接写入实时数据 (不是乐观更新)
 * - refresh：是否刷新实时数据；refreshAgain：下一轮再刷新一次 (超时，以设备回报为准)
 * - lockAll：设备不可控 (离线 / 停用 / 损坏)，需要刷新设备状态以置灰全部开关
 * - global：交给全局错误处理 (401、企业不可用)
 */
export interface ControlOutcome {
  level: 'success' | 'warning' | 'error'
  message: string
  actualState?: number
  refresh: boolean
  refreshAgain?: boolean
  lockAll?: boolean
  global?: boolean
}

export function interpretControl(r: { ok: true; data: RelayOp } | { ok: false; error: unknown }): ControlOutcome {
  if (r.ok) {
    const { status, actualState, errorMessage } = r.data
    if (status === 'success')
      return { level: 'success', message: '操作成功', actualState: actualState ?? undefined, refresh: true }
    if (status === 'failed' && actualState != null)
      return { level: 'warning', message: '设备回报状态与目标不一致', actualState, refresh: true }
    if (status === 'failed') return { level: 'error', message: errorMessage || '操作失败，请重试', refresh: false }
    return { level: 'warning', message: '设备未应答，结果未知', refresh: true, refreshAgain: true }
  }
  const e = r.error
  if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) return unconfirmed
  if (!isApiError(e)) return { level: 'error', message: errorText(e), refresh: true }
  if (e.status === 401 || COMPANY_DENIED_CODES.has(e.code))
    return { level: 'error', message: '', refresh: false, global: true }
  if (e.code === NETWORK_ERROR) return unconfirmed
  if (e.code === 'RELAY_BUSY') return { level: 'warning', message: '该通道正在被操作，请稍后', refresh: true }
  if (DEVICE_CODES[e.code]) return { level: 'warning', message: DEVICE_CODES[e.code], refresh: true, lockAll: true }
  if (e.status === 503) return { level: 'error', message: '服务暂不可用，请稍后重试', refresh: false }
  return { level: 'error', message: errorText(e), refresh: true }
}

const unconfirmed: ControlOutcome = {
  level: 'warning',
  message: '结果未确认，请查看开关状态与操作记录后再决定是否重试',
  refresh: true,
}

const DEVICE_CODES: Record<string, string> = {
  DEVICE_OFFLINE: '设备已离线，无法操作',
  DEVICE_DISABLED: '设备已停用，无法操作',
  DEVICE_FAULT: '设备故障，无法操作',
}
