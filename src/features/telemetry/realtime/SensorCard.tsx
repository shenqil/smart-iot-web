import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'
import type { CSSProperties } from 'react'
import { decimalsOf, formatValue } from '@/lib/resolution'
import { SENSOR_TONE, sensorKind } from '../lib/channelKind'
import type { SensorReading } from '../lib/realtime'
import { SensorGlyph } from './ChannelGlyph'
import { Sparkline } from './Sparkline'

const STATE_HINT: Partial<Record<SensorReading['state'], { short: string; full: string }>> = {
  over: { short: '超上限', full: '读数高于量程上限' },
  under: { short: '超下限', full: '读数低于量程下限' },
}

const WARNING = 'var(--ant-color-warning)'
const MUTED = 'var(--ant-color-text-quaternary)'

/**
 * 传感器实时值卡片
 *
 * ┌───────────────────────────────┐
 * │ [图标]  1 号棚空气温度               │  图标底色 = 传感器类别主题色 (温度橙、湿度蓝、光照琥珀 …)
 * │         空气温度 · 通道 0             │  显示名与标准名不同时，副标题给出标准名
 * │ 25.3 ℃                     ↑ 0.2  │  读数大字 + 单位；右侧为与上一次读数的变化 (超量程时为 ⚠ 超上限 / 超下限)
 * │ ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿ │  最近 60 次轮询的迷你曲线 (主题色)
 * │ ━━━━━━━━●───────────────────── │  量程标尺：已填充到当前值
 * │ -40                        80 ℃ │
 * └───────────────────────────────┘
 *
 * 超量程时主题色换为警示色并描边；无读数 / 暂无数据时主题色置灰；设备离线时整体置灰
 */
export function SensorCard({ reading, trail, offline }: { reading: SensorReading; trail: number[]; offline: boolean }) {
  const { config, name, text, state, position } = reading
  const icon = config.iconUrl || undefined
  const alert = state === 'over' || state === 'under'
  const noValue = state === 'invalid' || state === 'empty'
  const unit = config.unit?.trim()
  const kind = sensorKind(config)
  const tone = offline || noValue ? MUTED : alert ? WARNING : SENSOR_TONE[kind]
  const standard = config.standardName?.trim()
  const subtitle = [standard && standard !== name ? standard : null, `通道 ${config.channel}`]
    .filter(Boolean)
    .join(' · ')

  // 与上一次读数的变化 (按分辨率舍入后为 0 时不显示)
  const decimals = decimalsOf(config.resolution)
  const delta = !noValue && trail.length >= 2 ? trail[trail.length - 1] - trail[trail.length - 2] : 0
  const deltaText = Math.abs(delta).toFixed(decimals)
  const showDelta = !offline && Number(deltaText) !== 0

  const range = `${formatValue(config.rangeMin, config.resolution)} ~ ${formatValue(config.rangeMax, config.resolution)}${unit ? ` ${unit}` : ''}`

  return (
    <div
      style={{ '--tone': tone } as CSSProperties}
      className={`flex flex-col rounded-xl border border-solid bg-container px-4 pt-3.5 pb-3 transition-[border-color,box-shadow] hover:shadow-[0_2px_10px_rgb(0_0_0/0.06)] ${
        alert ? 'border-warning' : 'border-line'
      } ${offline ? 'grayscale' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,var(--tone)_12%,transparent)] text-(--tone)">
          {icon ? (
            <img src={icon} alt="" className={`size-6 object-contain ${offline ? 'opacity-50' : ''}`} />
          ) : (
            <SensorGlyph kind={kind} className="size-[22px]" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-fg" title={name}>
            {name}
          </div>
          <div className="mt-0.5 truncate text-fg-tertiary text-xs" title={subtitle}>
            {subtitle}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <div className={`flex min-w-0 flex-1 items-baseline gap-1 ${offline ? 'opacity-60' : ''}`}>
          <span
            className={`whitespace-nowrap font-semibold tabular-nums leading-none tracking-tight ${
              noValue ? 'text-fg-tertiary text-xl' : alert ? 'text-[30px] text-warning' : 'text-[30px] text-fg'
            }`}
          >
            {text}
          </span>
          {!noValue && unit && <span className="shrink-0 font-medium text-fg-secondary text-sm">{unit}</span>}
        </div>
        {alert ? (
          <Tooltip title={STATE_HINT[state]?.full}>
            <span className="mb-0.5 shrink-0 whitespace-nowrap rounded bg-warning/15 px-1.5 text-warning text-xs leading-5">
              ⚠ {STATE_HINT[state]?.short}
            </span>
          </Tooltip>
        ) : (
          showDelta && (
            <Tooltip title="与上一次读数相比">
              <span className="flex shrink-0 items-center gap-0.5 pb-0.5 text-fg-tertiary text-xs tabular-nums">
                {delta > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                {deltaText}
              </span>
            </Tooltip>
          )
        )}
      </div>

      <div className="mt-2.5">
        <Sparkline values={trail} color={tone} />
      </div>

      {position != null ? (
        <Tooltip title={`量程 ${range}`}>
          <div className="mt-2">
            <div className="relative h-1 rounded-full bg-[color-mix(in_srgb,var(--tone)_14%,var(--ant-color-border-secondary))]">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-[color-mix(in_srgb,var(--tone)_55%,transparent)]"
                style={{ width: `${position * 100}%` }}
              />
              <span
                className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-container border-solid bg-(--tone) shadow-[0_0_0_1px_var(--tone)]"
                style={{ left: `${position * 100}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-fg-tertiary tabular-nums">
              <span>{formatValue(config.rangeMin, config.resolution)}</span>
              <span>
                {formatValue(config.rangeMax, config.resolution)}
                {unit ? ` ${unit}` : ''}
              </span>
            </div>
          </div>
        </Tooltip>
      ) : (
        <div className="mt-2 text-[11px] text-fg-tertiary">
          {state === 'invalid' ? '该通道未接传感器' : state === 'empty' ? '暂无数据' : '未配置量程'}
        </div>
      )}
    </div>
  )
}
