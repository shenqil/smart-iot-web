import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  LockFilled,
  QuestionCircleFilled,
  UnlockFilled,
} from '@ant-design/icons'
import { Tag } from 'antd'
import { opDisplayStatus } from '@/features/telemetry/lib/realtime'

export const OP_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: '执行中', color: 'processing', icon: <ClockCircleFilled /> },
  success: { label: '成功', color: 'success', icon: <CheckCircleFilled /> },
  failed: { label: '失败', color: 'error', icon: <CloseCircleFilled /> },
  timeout: { label: '未应答', color: 'warning', icon: <QuestionCircleFilled /> },
  hold: { label: '手动接管', color: 'purple', icon: <LockFilled /> },
  release: { label: '恢复自动', color: 'cyan', icon: <UnlockFilled /> },
}

/** 手动接管 / 恢复自动记录：不是开关命令 (targetState 为当时的继电器状态) */
export const isHoldRecord = (status: string) => status === 'hold' || status === 'release'

export const opStatusOptions = Object.entries(OP_STATUS).map(([value, d]) => ({ value, label: d.label }))

/** 操作状态 (超过 1 分钟仍为 pending 按未应答显示) */
export function OpStatusTag({ op }: { op: { status: string; createdAt: string } }) {
  const d = OP_STATUS[opDisplayStatus(op)] ?? { label: op.status, color: 'default', icon: null }
  return (
    <Tag color={d.color} icon={d.icon} className="m-0">
      {d.label}
    </Tag>
  )
}

export const relayStateText = (s: number | null | undefined) => (s == null ? '—' : s ? '开启' : '关闭')
