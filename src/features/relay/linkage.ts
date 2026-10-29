import type { RelayLinkage } from './api'

/** 触发说明：1号棚 · 空气温度 > 35 ℃ (规则描述由服务端生成) */
export const linkageTriggerText = (v: Pick<RelayLinkage, 'sourceDeviceName' | 'sourceDeviceSn' | 'description'>) =>
  `${v.sourceDeviceName || v.sourceDeviceSn} · ${v.description}`

/** 动作：开启 / 关闭 */
export const linkageActionText = (state: number) => (state ? '开启' : '关闭')
