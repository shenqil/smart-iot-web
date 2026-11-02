import type { AppDevice } from '@/features/device/api'
import type { Realtime } from '@/features/telemetry/lib/realtime'
import { StatusTag } from './primitives'

export function deviceOnline(
  device: Pick<AppDevice, 'online' | 'onlineKnown'> | undefined,
  realtime?: Pick<Realtime, 'online'>,
): boolean | undefined {
  if (!device || device.onlineKnown === false) return undefined
  return realtime?.online ?? device.online
}
export function DeviceStatus({ online }: { online: boolean | undefined }) {
  return (
    <StatusTag tone={online === undefined ? 'neutral' : online ? 'success' : 'neutral'}>
      {online === undefined ? '状态未知' : online ? '在线' : '离线'}
    </StatusTag>
  )
}
