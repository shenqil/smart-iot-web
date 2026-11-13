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

export const alarmLevelOptions = Object.entries(ALARM_LEVEL).map(([v, d]) => ({ value: Number(v), label: d.label }))
export const alarmTypeOptions = Object.entries(ALARM_TYPE).map(([value, d]) => ({ value, label: d.label }))

export function AlarmLevelTag({ level }: { level: number }) {
  const d = ALARM_LEVEL[level]
  return (
    <Tag color={d?.color ?? 'default'} className="m-0">
      {level <= 2 ? '⚠ ' : ''}
      {d?.label ?? `级别 ${level}`}
    </Tag>
  )
}
