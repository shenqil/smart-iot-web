import { Tag, Tooltip } from 'antd'
import { dayjs, fmtDate } from '@/lib/time'

interface EnumDef {
  label: string
  color?: string
}

export const ACTIVE_STATUS: Record<string, EnumDef> = {
  active: { label: '启用', color: 'success' },
  inactive: { label: '停用', color: 'default' },
}
/** 设备状态：fault 由系统判定 (上报路数少于配置的通道数，已断开)，只能人工改回启用 */
export const DEVICE_STATUS: Record<string, EnumDef> = {
  ...ACTIVE_STATUS,
  fault: { label: '损坏', color: 'error' },
}
export const SITE_STATUS: Record<string, EnumDef> = {
  active: { label: '运营中', color: 'success' },
  inactive: { label: '停用', color: 'default' },
  under_construction: { label: '建设中', color: 'warning' },
}
export const COMPANY_ROLE: Record<string, EnumDef> = {
  admin: { label: '管理员', color: 'processing' },
  user: { label: '成员' },
}
export const SYSTEM_ROLE: Record<string, EnumDef> = {
  admin: { label: '平台管理员', color: 'purple' },
  none: { label: '普通用户' },
}

/** 选项 (Select options) */
export const enumOptions = (defs: Record<string, EnumDef>) =>
  Object.entries(defs).map(([value, d]) => ({ value, label: d.label }))

export function EnumTag({ value, defs }: { value: string | null | undefined; defs: Record<string, EnumDef> }) {
  if (!value) return <span className="text-fg-tertiary">—</span>
  const d = defs[value]
  return <Tag color={d?.color}>{d?.label ?? value}</Tag>
}

/** 在线状态：颜色 + 符号 + 文字，不只靠颜色区分 */
export function OnlineTag({ online }: { online: boolean }) {
  return online ? <Tag color="success">● 在线</Tag> : <Tag>○ 离线</Tag>
}

/** 企业服务过期时间：已过期红色，30 天内橙色 */
export function ExpireTag({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-fg-secondary">不过期</span>
  const days = dayjs(value).diff(dayjs(), 'day', true)
  if (days <= 0)
    return (
      <Tooltip title={fmtDate(value)}>
        <Tag color="error">已过期</Tag>
      </Tooltip>
    )
  if (days <= 30)
    return (
      <span className="whitespace-nowrap">
        {fmtDate(value)} <Tag color="warning">剩 {Math.ceil(days)} 天</Tag>
      </span>
    )
  return <span>{fmtDate(value)}</span>
}
