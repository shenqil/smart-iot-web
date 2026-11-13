import type { AppDevice } from '@shared/api/device'
import type { Realtime } from '@shared/telemetry/lib/realtime'
import { StatusTag } from './primitives'

export function deviceOnline(
  device: Pick<AppDevice, 'online'> | undefined,
  realtime?: Pick<Realtime, 'online'>,
): boolean | undefined {
  if (!device) return undefined
  return realtime?.online ?? device.online
}
export function DeviceStatus({ online }: { online: boolean | undefined }) {
  return (
    <StatusTag tone={online === undefined ? 'neutral' : online ? 'success' : 'neutral'}>
      {online === undefined ? '状态未知' : online ? '在线' : '离线'}
    </StatusTag>
  )
}
