import { api, companyHeader, type Schemas, unwrap } from '@/api/client'

export type DeviceDetail = Schemas['DeviceDetailView']
/** 修改基本信息 (部分更新：未传的字段不修改；deviceTypeId、经纬度传 null 表示清除) */
export type DeviceUpdateBody = Schemas['DeviceUpdateBody']
/** 传感器通道 (详情) 与保存时的请求体 */
export type SensorView = Schemas['DeviceSensorView']
export type SensorBody = Schemas['DeviceSensorBody']
/** 告警规则 (在传感器配置中维护；联动动作单独配置) */
export type RuleView = Schemas['DeviceRuleView']
export type RuleBody = Schemas['DeviceRuleBody']
export type Calibration = Schemas['DeviceCalibration']
export type Simulation = Schemas['DeviceSimulation']
/** 继电器通道 (详情) 与保存时的请求体 */
export type RelayView = Schemas['DeviceRelayView']
export type RelayFields = Schemas['DeviceRelayFields']
/** 摄像头 (详情；appSecret 脱敏) 与修改请求体 (部分更新) */
export type CameraView = Schemas['DeviceCameraView']
export type CameraBody = Schemas['DeviceCameraBody']
/** 可选的被控设备 (设备列表行) */
export type DeviceOption = Schemas['DeviceView']
/** 定时开关规则 */
export type RelaySchedule = Schemas['RelayScheduleView']
/** 新增 / 修改定时规则 (整体替换) */
export type RelayScheduleBody = Schemas['RelayScheduleBody']
/** 联动配置页：设备的一条告警规则及其联动动作 */
export type LinkageRule = Schemas['LinkageRuleView']
export type LinkageAction = Schemas['LinkageActionView']
export type LinkageActionBody = Schemas['LinkageActionBody']
/** 控制本设备某一路继电器的一条规则 (含其他设备的规则) */
export type RelayLinkage = Schemas['LinkageView']

/**
 * 设备配置页的接口：平台端与企业端路径不同，页面只依赖这个接口 (FRONTEND_DESIGN §3.4，企业端 §4.3 复用)
 * 配置保存后立即生效 (服务端刷新配置缓存)，不需要设备重连
 */
export interface DeviceConfigApi {
  /** 缓存键前缀 (端 + 企业) */
  keyPrefix: readonly unknown[]
  detail: (id: number) => Promise<DeviceDetail>
  updateBasic: (id: number, body: DeviceUpdateBody) => Promise<DeviceDetail>
  updateSensors: (id: number, sensors: SensorBody[]) => Promise<DeviceDetail>
  updateRelays: (id: number, relays: RelayFields[]) => Promise<DeviceDetail>
  updateCamera: (id: number, camera: CameraBody) => Promise<DeviceDetail>
  disconnect: (id: number) => Promise<{ notice: string }>
  /** 联动：设备的全部告警规则及联动动作 / 整体替换一条规则的联动动作 */
  alertRules: (id: number) => Promise<LinkageRule[]>
  setActions: (ruleId: number, actions: LinkageActionBody[]) => Promise<LinkageAction[]>
  /** 联动总览：哪些规则控制这台设备的继电器 */
  relayLinkages: (id: number) => Promise<RelayLinkage[]>
  /** 联动动作：搜索可选的被控设备 (范围内，最多 20 个) */
  searchDevices: (keyword: string) => Promise<DeviceOption[]>
  /** 设备详情页链接 (联动总览跳转到触发设备的联动配置) */
  deviceHref: (id: number) => string
  /** 定时开关：设备的全部规则 / 新增 / 修改 / 删除 */
  schedules: (id: number) => Promise<RelaySchedule[]>
  createSchedule: (id: number, body: RelayScheduleBody) => Promise<RelaySchedule>
  updateSchedule: (scheduleId: number, body: RelayScheduleBody) => Promise<RelaySchedule>
  deleteSchedule: (scheduleId: number) => Promise<unknown>
}

const p = (id: number) => ({ params: { path: { id } } })

export const adminDeviceConfigApi: DeviceConfigApi = {
  keyPrefix: ['admin', 0, 'devices'],
  detail: (id) => unwrap(api.GET('/api/v1/admin/devices/{id}', p(id))),
  updateBasic: (id, body) => unwrap(api.PUT('/api/v1/admin/devices/{id}', { ...p(id), body })),
  updateSensors: (id, sensors) =>
    unwrap(api.PUT('/api/v1/admin/devices/{id}/sensors', { ...p(id), body: { sensors } })),
  updateRelays: (id, relays) => unwrap(api.PUT('/api/v1/admin/devices/{id}/relays', { ...p(id), body: { relays } })),
  updateCamera: (id, body) => unwrap(api.PUT('/api/v1/admin/devices/{id}/camera', { ...p(id), body })),
  disconnect: (id) => unwrap(api.POST('/api/v1/admin/devices/{id}/disconnect', p(id))),
  alertRules: (id) => unwrap(api.GET('/api/v1/admin/devices/{id}/alert-rules', p(id))).then((r) => r ?? []),
  setActions: (rid, actions) =>
    unwrap(api.PUT('/api/v1/admin/alert-rules/{id}/actions', { ...p(rid), body: { actions } })).then((r) => r ?? []),
  relayLinkages: (id) => unwrap(api.GET('/api/v1/admin/devices/{id}/relays/linkages', p(id))).then((r) => r ?? []),
  searchDevices: (keyword) =>
    unwrap(
      api.GET('/api/v1/admin/devices', { params: { query: { keyword: keyword || undefined, pageSize: 20 } as never } }),
    ).then((r) => r.records ?? []),
  deviceHref: (id) => `/admin/devices/${id}`,
  schedules: (id) => unwrap(api.GET('/api/v1/admin/devices/{id}/relay-schedules', p(id))).then((r) => r ?? []),
  createSchedule: (id, body) => unwrap(api.POST('/api/v1/admin/devices/{id}/relay-schedules', { ...p(id), body })),
  updateSchedule: (sid, body) => unwrap(api.PUT('/api/v1/admin/relay-schedules/{id}', { ...p(sid), body })),
  deleteSchedule: (sid) => unwrap(api.DELETE('/api/v1/admin/relay-schedules/{id}', p(sid))),
}

/** 企业管理端 (M3 使用) */
export const tenantDeviceConfigApi = (companyId: number): DeviceConfigApi => {
  const h = (id: number) => ({ params: { path: { id }, header: companyHeader(companyId) } })
  return {
    keyPrefix: ['tenant', companyId, 'devices'],
    detail: (id) => unwrap(api.GET('/api/v1/tenant/devices/{id}', h(id))),
    updateBasic: (id, body) => unwrap(api.PUT('/api/v1/tenant/devices/{id}', { ...h(id), body })),
    updateSensors: (id, sensors) =>
      unwrap(api.PUT('/api/v1/tenant/devices/{id}/sensors', { ...h(id), body: { sensors } })),
    updateRelays: (id, relays) => unwrap(api.PUT('/api/v1/tenant/devices/{id}/relays', { ...h(id), body: { relays } })),
    updateCamera: (id, body) => unwrap(api.PUT('/api/v1/tenant/devices/{id}/camera', { ...h(id), body })),
    disconnect: (id) => unwrap(api.POST('/api/v1/tenant/devices/{id}/disconnect', h(id))),
    alertRules: (id) => unwrap(api.GET('/api/v1/tenant/devices/{id}/alert-rules', h(id))).then((r) => r ?? []),
    setActions: (rid, actions) =>
      unwrap(api.PUT('/api/v1/tenant/alert-rules/{id}/actions', { ...h(rid), body: { actions } })).then((r) => r ?? []),
    relayLinkages: (id) => unwrap(api.GET('/api/v1/tenant/devices/{id}/relays/linkages', h(id))).then((r) => r ?? []),
    searchDevices: (keyword) =>
      unwrap(
        api.GET('/api/v1/tenant/devices', {
          params: { header: companyHeader(companyId), query: { keyword: keyword || undefined, pageSize: 20 } as never },
        }),
      ).then((r) => r.records ?? []),
    deviceHref: (id) => `/tenant/${companyId}/devices/${id}`,
    schedules: (id) => unwrap(api.GET('/api/v1/tenant/devices/{id}/relay-schedules', h(id))).then((r) => r ?? []),
    createSchedule: (id, body) => unwrap(api.POST('/api/v1/tenant/devices/{id}/relay-schedules', { ...h(id), body })),
    updateSchedule: (sid, body) => unwrap(api.PUT('/api/v1/tenant/relay-schedules/{id}', { ...h(sid), body })),
    deleteSchedule: (sid) => unwrap(api.DELETE('/api/v1/tenant/relay-schedules/{id}', h(sid))),
  }
}

export const deviceDetailKey = (cfg: DeviceConfigApi, id: number) => [...cfg.keyPrefix, 'detail', id] as const

/** 联动相关缓存 (规则的联动动作、继电器联动总览)：保存传感器 / 继电器 / 联动后整体失效 */
export const linkageKeys = {
  all: (cfg: DeviceConfigApi) => [...cfg.keyPrefix, 'linkage'] as const,
  rules: (cfg: DeviceConfigApi, id: number) => [...cfg.keyPrefix, 'linkage', 'rules', id] as const,
  relays: (cfg: DeviceConfigApi, id: number) => [...cfg.keyPrefix, 'linkage', 'relays', id] as const,
}

export const schedulesKey = (cfg: DeviceConfigApi, id: number) => [...cfg.keyPrefix, 'schedules', id] as const
