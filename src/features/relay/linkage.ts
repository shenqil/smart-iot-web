import type { RelayLinkage } from './api'

const COND: Record<string, string> = { greater: '大于', less: '小于', equal: '等于', range: '处于' }

/** 规则条件：小于 1.2 ms/cm、处于 1 ~ 2 ms/cm */
export function linkageCondText(v: Pick<RelayLinkage, 'alertType' | 'threshold' | 'minValue' | 'maxValue' | 'unit'>) {
  const value = v.alertType === 'range' ? `${v.minValue} ~ ${v.maxValue}` : `${v.threshold}`
  return `${COND[v.alertType] ?? v.alertType} ${value}${v.unit ? ` ${v.unit}` : ''}`
}

/** 触发说明：1号棚 · 营养液EC 小于 1.2 ms/cm */
export function linkageTriggerText(v: RelayLinkage) {
  const ch = v.channelName || `通道 ${v.channelNum}`
  return `${v.sourceDeviceName || v.sourceDeviceSn} · ${ch} ${linkageCondText(v)}`
}

/** 动作：开启 / 关闭 */
export const linkageActionText = (state: number) => (state ? '开启' : '关闭')
