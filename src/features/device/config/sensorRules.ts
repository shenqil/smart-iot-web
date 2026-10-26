import { RESOLUTIONS } from '@/lib/resolution'
import { UUID_RE, uuid } from '@/utils/uuid'
import type { SensorAlertConfig, SensorConfig } from './api'

export const ALERT_TYPES = [
  { value: 'greater', label: '大于' },
  { value: 'less', label: '小于' },
  { value: 'equal', label: '等于' },
  { value: 'range', label: '区间内' },
] as const

export const ALERT_LEVELS = [
  { value: 1, label: '紧急', color: 'red' },
  { value: 2, label: '重要', color: 'orange' },
  { value: 3, label: '警告', color: 'gold' },
  { value: 4, label: '提示', color: 'blue' },
] as const

export const newRule = (): SensorAlertConfig => ({
  code: uuid(),
  enabled: true,
  alertType: 'greater',
  level: 3,
  threshold: 0,
  repeatInterval: 300,
})

/** 复制规则 / 通道：必须生成新编码 (编码全局唯一)；联动动作一起复制 (保存时按新增动作校验) */
export const cloneRule = (r: SensorAlertConfig): SensorAlertConfig => ({
  ...r,
  code: uuid(),
  actions: r.actions?.map((a) => ({ ...a })),
})

export const copyChannel = (src: SensorConfig, target: number): SensorConfig => ({
  ...structuredClone(src),
  channelNum: target,
  alertConfigs: (src.alertConfigs ?? []).map(cloneRule),
})

/** 保存前：启用的规则缺编码时补生成 (旧数据)，并按通道号排序 */
export function prepareSensors(list: SensorConfig[]): SensorConfig[] {
  return [...list]
    .sort((a, b) => a.channelNum - b.channelNum)
    .map((s) => ({
      ...s,
      displayName: s.displayName?.trim() || undefined,
      unit: s.unit?.trim() || undefined,
      alertConfigs: (s.alertConfigs ?? []).map((r) => (r.enabled && !r.code ? { ...r, code: uuid() } : r)),
    }))
}

/** 通道显示名 */
export const channelLabel = (s: Pick<SensorConfig, 'channelNum' | 'displayName' | 'standardName'>) =>
  s.displayName || s.standardName || `通道 ${s.channelNum}`

/** 前端校验 (与后端 ValidateConfig 一致，提前给出可读的中文提示) */
export function validateSensors(list: SensorConfig[], maxChannels: number): string[] {
  const errs: string[] = []
  const codes = new Set<string>()
  const seen = new Set<number>()
  for (const s of list) {
    const name = `通道 ${s.channelNum}${s.displayName || s.standardName ? ` (${channelLabel(s)})` : ''}`
    if (s.channelNum < 0 || s.channelNum >= maxChannels) errs.push(`${name}：通道号超出范围 0~${maxChannels - 1}`)
    if (seen.has(s.channelNum)) errs.push(`${name}：通道重复`)
    seen.add(s.channelNum)
    if (s.minValue != null && s.maxValue != null && (s.minValue !== 0 || s.maxValue !== 0) && s.minValue > s.maxValue)
      errs.push(`${name}：量程下限大于上限`)
    if (s.resolution && !(RESOLUTIONS as readonly number[]).includes(s.resolution)) errs.push(`${name}：分辨率不合法`)
    ;(s.alertConfigs ?? []).forEach((r, i) => {
      const rn = `${name} 规则 ${i + 1}`
      if (r.alertType === 'range' && (r.minValue ?? 0) > (r.maxValue ?? 0)) errs.push(`${rn}：区间下限大于上限`)
      if (!r.repeatInterval || r.repeatInterval <= 0) errs.push(`${rn}：推送间隔必须大于 0 秒`)
      if (r.code) {
        if (!UUID_RE.test(r.code)) errs.push(`${rn}：规则编码格式不正确`)
        if (codes.has(r.code)) errs.push(`${rn}：规则编码重复 (请删除后重新添加)`)
        codes.add(r.code)
      }
    })
  }
  return errs
}

/** 校准方式说明 */
export function correctionSummary(s: SensorConfig): string {
  const c = s.correction
  if (!c?.mode) return '—'
  if (c.mode === 'coefficient')
    return `×${c.coefficientValue || 1}${c.errorValue ? ` ${c.errorValue > 0 ? '+' : ''}${c.errorValue}` : ''}`
  if (c.mode === 'error') return `${(c.errorValue ?? 0) >= 0 ? '+' : ''}${c.errorValue ?? 0}`
  return `固定 ${c.customValue ?? 0} ±${c.floatValue ?? 0}`
}

/** 规则说明，如 "> 35"、"10 ~ 20" */
export function ruleSummary(r: SensorAlertConfig, unit = ''): string {
  const u = unit ? ` ${unit}` : ''
  switch (r.alertType) {
    case 'greater':
      return `> ${r.threshold ?? 0}${u}`
    case 'less':
      return `< ${r.threshold ?? 0}${u}`
    case 'equal':
      return `= ${r.threshold ?? 0}${u}`
    case 'range':
      return `${r.minValue ?? 0} ~ ${r.maxValue ?? 0}${u}`
    default:
      return '—'
  }
}
