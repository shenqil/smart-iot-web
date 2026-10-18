import { Button } from 'antd'
import { isApiError } from '@/api/errors'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'
import type { DeviceConfigApi } from './api'

/** 断开设备连接 (同步，约 5s 内返回)：设备自动重连并加载最新配置 (FRONTEND_DESIGN §3.4) */
export async function disconnectDevice(cfg: DeviceConfigApi, id: number) {
  try {
    const r = await cfg.disconnect(id)
    notify.success(r.notice || '设备已断开，将自动重连并加载最新配置')
  } catch (e) {
    if (isApiError(e) && e.code === 'DEVICE_OFFLINE') notify.info('设备当前未连接，重连时会自动加载最新配置')
    else if (isApiError(e) && e.status === 503) notify.error('网关暂不可用，请稍后重试')
    else handleGlobalError(e)
  }
}

export function confirmDisconnect(cfg: DeviceConfigApi, id: number, extra = '') {
  return new Promise<void>((resolve) =>
    notify.modal()?.confirm({
      title: '断开设备连接？',
      content: `断开后设备会自动重连并加载最新配置，并产生一条离线告警。${extra}`,
      okText: '断开',
      okButtonProps: { danger: true },
      onOk: () => disconnectDevice(cfg, id),
      afterClose: resolve,
    }),
  )
}

/** 保存基本信息 / 传感器配置后的提示，附"立即断开重连" */
export function showConfigNotice(notice: string | undefined, cfg: DeviceConfigApi, id: number) {
  if (!notice) return notify.success('保存成功')
  notify.success(
    <span>
      保存成功，{notice}
      <Button type="link" size="small" onClick={() => confirmDisconnect(cfg, id)}>
        立即断开重连
      </Button>
    </span>,
  )
}
