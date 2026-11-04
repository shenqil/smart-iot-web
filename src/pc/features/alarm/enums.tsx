import { Tag } from 'antd'

/** 告警级别：颜色 + 文字 (不只靠颜色区分) */
export const ALARM_LEVEL: Record<number, { label: string; color: string }> = {
  1: { label: '紧急', color: 'red' },
  2: { label: '重要', color: 'volcano' },
  3: { label: '警告', color: 'gold' },
  4: { label: '提示', color: 'blue' },
}

export const ALARM_TYPE: Record<string, { label: string; color?: string }> = {
  threshold: { label: '越限', color: 'orange' },
  offline: { label: '离线' },
  fault: { label: '故障', color: 'red' },
  relay_failed: { label: '定时开关失败', color: 'magenta' },
}

/** 告警状态：进行中 / 已解除 (条件不再满足、设备重新上线) / 已关闭 (无法再判定或一次性告警) */
export const ALARM_STATUS: Record<string, { label: string; color: string }> = {
  active: { label: '进行中', color: 'error' },
  recovered: { label: '已解除', color: 'success' },
  closed: { label: '已关闭', color: 'default' },
}

export const alarmLevelOptions = Object.entries(ALARM_LEVEL).map(([v, d]) => ({ value: Number(v), label: d.label }))
export const alarmTypeOptions = Object.entries(ALARM_TYPE).map(([value, d]) => ({ value, label: d.label }))
export const alarmStatusOptions = Object.entries(ALARM_STATUS).map(([value, d]) => ({ value, label: d.label }))

export function AlarmLevelTag({ level }: { level: number }) {
  const d = ALARM_LEVEL[level]
  return (
    <Tag color={d?.color ?? 'default'} className="m-0">
      {level <= 2 ? '⚠ ' : ''}
      {d?.label ?? `级别 ${level}`}
    </Tag>
  )
}

export function AlarmStatusTag({ status }: { status: string }) {
  const d = ALARM_STATUS[status]
  return (
    <Tag color={d?.color ?? 'default'} className="m-0">
      {d?.label ?? status}
    </Tag>
  )
}
