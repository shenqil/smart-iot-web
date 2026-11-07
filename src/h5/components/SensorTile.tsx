import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons'
import { decimalsOf, formatValue } from '@shared/lib/resolution'
import { SENSOR_TONE, sensorKind } from '@shared/telemetry/lib/channelKind'
import { type AppSensor, type Readings, readSensor } from '@shared/telemetry/lib/realtime'
import { SensorGlyph } from '@shared/telemetry/realtime/ChannelGlyph'
import { Sparkline } from '@shared/telemetry/realtime/Sparkline'
import type { CSSProperties } from 'react'

export interface SensorTileProps {
  sensor: AppSensor
  values?: Readings
  trail?: number[]
  online?: boolean | undefined
}

export function SensorTile({ sensor, values, trail = [], online }: SensorTileProps) {
  const reading = readSensor(sensor, values)
  const { config, name, text, state, position } = reading
  const icon = config.iconUrl || undefined
  const alert = state === 'over' || state === 'under'
  const noValue = state === 'invalid' || state === 'empty'
  const unit = config.unit?.trim()
  const kind = sensorKind(config)
  const offline = online === false
  const tone = offline || noValue ? '#9ca3af' : alert ? '#d97706' : SENSOR_TONE[kind]
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
    <article
      style={{ '--tone': tone } as CSSProperties}
      className={`h5-sensor flex flex-col justify-between rounded-xl border border-solid p-3 transition-colors ${
        alert ? 'border-amber-400 bg-amber-50/50' : 'border-[#e3ebe3] bg-white'
      } ${offline ? 'grayscale opacity-75' : ''}`}
      aria-label={`${name} ${text} ${unit ?? ''} ${alert ? (state === 'over' ? '超出量程上限' : '低于量程下限') : ''}`}
    >
      <div>
        {/* 头部：类别图标 + 名称与副标题 */}
        <div className="flex items-start gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--tone)_12%,transparent)] text-(--tone)">
            {icon ? (
              <img src={icon} alt="" className={`size-5 object-contain ${offline ? 'opacity-50' : ''}`} />
            ) : (
              <SensorGlyph kind={kind} className="size-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-[var(--h5-text,#233d31)]" title={name}>
              {name}
            </div>
            <div className="mt-0.5 truncate text-xs text-[var(--h5-muted,#63786d)]" title={subtitle}>
              {subtitle}
            </div>
          </div>
        </div>

        {/* 读数 + 警示角标或趋势变化 */}
        <div className="mt-2.5 flex items-end justify-between gap-1">
          <div className={`flex min-w-0 items-baseline gap-1 ${offline ? 'opacity-60' : ''}`}>
            <span
              className={`whitespace-nowrap font-semibold tabular-nums leading-none tracking-tight ${
                noValue
                  ? 'text-lg text-[var(--h5-muted,#63786d)]'
                  : alert
                    ? 'text-2xl text-amber-600'
                    : 'text-2xl text-[var(--h5-text,#233d31)]'
              }`}
            >
              {text}
            </span>
            {!noValue && unit && (
              <span className="shrink-0 text-xs font-medium text-[var(--h5-muted,#63786d)]">{unit}</span>
            )}
          </div>
          {alert ? (
            <span className="mb-0.5 shrink-0 whitespace-nowrap rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
              ⚠ {state === 'over' ? '超上限' : '超下限'}
            </span>
          ) : (
            showDelta && (
              <span className="flex shrink-0 items-center gap-0.5 pb-0.5 text-xs text-[var(--h5-muted,#63786d)] tabular-nums">
                {delta > 0 ? (
                  <ArrowUpOutlined className="text-[10px]" />
                ) : (
                  <ArrowDownOutlined className="text-[10px]" />
                )}
                {deltaText}
              </span>
            )
          )}
        </div>

        {/* 迷你折线趋势 */}
        <div className="mt-2">
          <Sparkline values={trail} color={tone} />
        </div>
      </div>

      {/* 量程进度条与上下限标尺 */}
      <div className="mt-2 pt-1">
        {position != null ? (
          <div title={`量程 ${range}`}>
            <div className="relative h-1 rounded-full bg-[color-mix(in_srgb,var(--tone)_14%,#e3ebe3)]">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-[color-mix(in_srgb,var(--tone)_55%,transparent)]"
                style={{ width: `${Math.min(Math.max(position * 100, 0), 100)}%` }}
              />
              <span
                className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white border-solid bg-(--tone) shadow-[0_0_0_1px_var(--tone)]"
                style={{ left: `${Math.min(Math.max(position * 100, 0), 100)}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[var(--h5-muted,#63786d)] tabular-nums">
              <span>{formatValue(config.rangeMin, config.resolution)}</span>
              <span>
                {formatValue(config.rangeMax, config.resolution)}
                {unit ? ` ${unit}` : ''}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-[var(--h5-muted,#63786d)]">
            {state === 'invalid' ? '该通道未接传感器' : state === 'empty' ? '暂无数据' : '未配置量程'}
          </div>
        )}
      </div>
    </article>
  )
}
