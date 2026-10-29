import { RESOLUTIONS } from '@/lib/resolution'
import { uuid } from '@/utils/uuid'
import type { Calibration, RuleBody, SensorBody, SensorView, Simulation } from './api'

export const ALERT_TYPES = [
  { value: 'greater', label: '大于' },
  { value: 'less', label: '小于' },
  { value: 'equal', label: '等于' },
  { value: 'between', label: '区间内' },
] as const

export const ALERT_LEVELS = [
  { value: 1, label: '紧急', color: 'red' },
  { value: 2, label: '重要', color: 'orange' },
  { value: 3, label: '警告', color: 'gold' },
  { value: 4, label: '提示', color: 'blue' },
] as const

/** 每个通道最多的规则数 (与后端一致) */
export const MAX_RULES = 16

/** 编辑中的告警规则：key 为表格行键 (不提交)；已有规则带 id (保存后 id 不变，联动动作随之保留) */
export type RuleDraft = RuleBody & { key: string; actionCount?: number }

/** 编辑中的传感器通道：standardName 只用于显示 (不提交) */
export type SensorDraft = Omit<SensorBody, 'rules'> & { standardName?: string; rules: RuleDraft[] }

const isIdentity = (c: Calibration | undefined) => !c || (c.scale === 1 && c.offset === 0)

/** 详情 → 编辑草稿 */
export const toDraft = (v: SensorView): SensorDraft => ({
  channel: v.channel,
  standardSensorId: v.standardSensorId,
  standardName: v.standardName || undefined,
  name: v.name || undefined,
  unit: v.unit || undefined,
  rangeMin: v.rangeMin,
  rangeMax: v.rangeMax,
  resolution: v.resolution,
  iconUrl: v.iconUrl || undefined,
  calibration: isIdentity(v.calibration) ? undefined : v.calibration,
  simulation: v.simulation ?? undefined,
  rules: v.rules.map(({ actionCount, ...r }) => ({ ...r, key: `r${r.id}`, actionCount })),
})

export const newRule = (): RuleDraft => ({
  key: uuid(),
  enabled: true,
  condition: 'greater',
  threshold: 0,
  level: 3,
  repeatSeconds: 300,
  createAlarm: true,
})

/** 复制规则：作为新规则 (不带 id，联动动作不复制) */
export const cloneRule = ({ id: _id, actionCount: _n, ...r }: RuleDraft): RuleDraft => ({ ...r, key: uuid() })

export const copyChannel = (src: SensorDraft, target: number): SensorDraft => ({
  ...structuredClone(src),
  channel: target,
  rules: src.rules.map(cloneRule),
})

/** 草稿 → 请求体：去掉只用于显示的字段，空白文本不提交，按通道号排序 */
export function prepareSensors(list: SensorDraft[]): SensorBody[] {
  return [...list]
    .sort((a, b) => a.channel - b.channel)
    .map(({ standardName: _s, rules, ...s }) => ({
      ...s,
      name: s.name?.trim() || undefined,
      unit: s.unit?.trim() || undefined,
      calibration: isIdentity(s.calibration) ? undefined : s.calibration,
      simulation: s.simulation ?? undefined,
      rules: rules.map(({ key: _k, actionCount: _n, ...r }) => r),
    }))
}

/** 通道显示名 */
export const channelLabel = (s: Pick<SensorDraft, 'channel' | 'name' | 'standardName'>) =>
  s.name?.trim() || s.standardName || `通道 ${s.channel}`

/** 前端校验 (与后端一致，提前给出可读的中文提示) */
export function validateSensors(list: SensorDraft[], maxChannels: number): string[] {
  const errs: string[] = []
  const seen = new Set<number>()
  for (const s of list) {
    const name = `通道 ${s.channel}${s.name || s.standardName ? ` (${channelLabel(s)})` : ''}`
    if (s.channel < 0 || s.channel >= maxChannels) errs.push(`${name}：通道号超出范围 0~${maxChannels - 1}`)
    if (seen.has(s.channel)) errs.push(`${name}：通道重复`)
    seen.add(s.channel)
    if ((s.rangeMin ?? 0) > (s.rangeMax ?? 0)) errs.push(`${name}：量程下限大于上限`)
    if (s.resolution && !(RESOLUTIONS as readonly number[]).includes(s.resolution)) errs.push(`${name}：分辨率不合法`)
    if (s.calibration && s.calibration.scale === 0) errs.push(`${name}：校准系数不能为 0`)
    if (s.simulation && s.simulation.jitter < 0) errs.push(`${name}：模拟值浮动不能为负数`)
    if (s.rules.length > MAX_RULES) errs.push(`${name}：告警规则最多 ${MAX_RULES} 条`)
    s.rules.forEach((r, i) => {
      const rn = `${name} 规则 ${i + 1}`
      if (r.condition === 'between' && (r.lower ?? 0) > (r.upper ?? 0)) errs.push(`${rn}：区间下限大于上限`)
      if (!r.repeatSeconds || r.repeatSeconds < 1 || r.repeatSeconds > 86_400)
        errs.push(`${rn}：推送间隔须为 1~86400 秒`)
    })
  }
  return errs
}

/** 校准 / 模拟说明 */
export function calibrationSummary(s: { calibration?: Calibration; simulation?: Simulation }): string {
  if (s.simulation) return `模拟 ${s.simulation.base} ±${s.simulation.jitter}`
  const c = s.calibration
  if (isIdentity(c) || !c) return '—'
  const offset = c.offset ? ` ${c.offset > 0 ? '+' : ''}${c.offset}` : ''
  return c.scale === 1 ? offset.trim() : `×${c.scale}${offset}`
}

/** 规则说明，如 "> 35 ℃"、"10 ~ 20" */
export function ruleSummary(r: Pick<RuleBody, 'condition' | 'threshold' | 'lower' | 'upper'>, unit = ''): string {
  const u = unit ? ` ${unit}` : ''
  switch (r.condition) {
    case 'greater':
      return `> ${r.threshold ?? 0}${u}`
    case 'less':
      return `< ${r.threshold ?? 0}${u}`
    case 'equal':
      return `= ${r.threshold ?? 0}${u}`
    case 'between':
      return `${r.lower ?? 0} ~ ${r.upper ?? 0}${u}`
    default:
      return '—'
  }
}
