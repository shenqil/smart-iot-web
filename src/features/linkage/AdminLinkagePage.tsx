import { adminDeviceConfigApi } from '@/features/device/config/api'
import { LinkageOverview } from './LinkageOverview'

/** 平台 · 联动总览 */
export default function AdminLinkagePage() {
  return <LinkageOverview cfg={adminDeviceConfigApi} />
}
