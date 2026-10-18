import { api, companyHeader, type Schemas, unwrap } from '@/api/client'

export type DeviceDetail = Schemas['DeviceDetailView']
export type DeviceBasicBody = Schemas['DeviceBasicBody']
export type SensorConfig = Schemas['SensorConfig']
export type SensorAlertConfig = Schemas['SensorAlertConfig']
export type SensorCorrection = Schemas['SensorCorrection']
export type RelayConfig = Schemas['RelayConfig']
export type CameraConfig = Schemas['CameraConfig']

/**
 * 设备配置页的接口：平台端与企业端路径不同，页面只依赖这个接口 (FRONTEND_DESIGN §3.4，企业端 §4.3 复用)
 */
export interface DeviceConfigApi {
  /** 缓存键前缀 (端 + 企业) */
  keyPrefix: readonly unknown[]
  detail: (id: number) => Promise<DeviceDetail>
  updateBasic: (id: number, body: DeviceBasicBody) => Promise<DeviceDetail>
  updateSensors: (id: number, sensors: SensorConfig[]) => Promise<DeviceDetail>
  updateRelays: (id: number, relays: RelayConfig[]) => Promise<DeviceDetail>
  updateCamera: (id: number, camera: CameraConfig) => Promise<DeviceDetail>
  disconnect: (id: number) => Promise<{ notice: string }>
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
  }
}

export const deviceDetailKey = (cfg: DeviceConfigApi, id: number) => [...cfg.keyPrefix, 'detail', id] as const
