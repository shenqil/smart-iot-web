import { isApiError } from '@/api/errors'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'
import type { DeviceConfigApi } from './api'

/** 断开设备连接 (同步，约 7s 内返回)：设备会自动重连 (FRONTEND_DESIGN §3.4) */
export async function disconnectDevice(cfg: DeviceConfigApi, id: number) {
  try {
    const r = await cfg.disconnect(id)
    notify.success(r.notice || '设备已断开，将自动重连')
  } catch (e) {
    if (isApiError(e) && e.code === 'DEVICE_OFFLINE') notify.info('设备当前未连接')
    else if (isApiError(e) && e.status === 503) notify.error('网关暂不可用，请稍后重试')
    else handleGlobalError(e)
  }
}

export function confirmDisconnect(cfg: DeviceConfigApi, id: number, extra = '') {
  return new Promise<void>((resolve) =>
    notify.modal()?.confirm({
      title: '断开设备连接？',
      content: `断开后设备会自动重连，并产生一条离线告警。配置修改保存后即生效，不需要断开。${extra}`,
      okText: '断开',
      okButtonProps: { danger: true },
      onOk: () => disconnectDevice(cfg, id),
      afterClose: resolve,
    }),
  )
}
