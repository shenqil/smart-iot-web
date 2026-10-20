import { DashboardOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'
import { formatValue } from '@/lib/resolution'
import type { SensorReading } from '../lib/realtime'
import { Sparkline } from './Sparkline'

const STATE_HINT: Partial<Record<SensorReading['state'], string>> = {
  over: '高于量程',
  under: '低于量程',
}

/**
 * 传感器实时值卡片：读数 + 迷你曲线 (最近 60 次轮询) + 量程标尺
 * 超量程时卡片描边与标尺转为警示色；设备离线时整体置灰
 */
export function SensorCard({ reading, trail, offline }: { reading: SensorReading; trail: number[]; offline: boolean }) {
  const { config, name, text, state, position } = reading
  const alert = state === 'over' || state === 'under'
  const noValue = state === 'invalid' || state === 'empty'
  const unit = config.unit?.trim()
  return (
    <div
      className={`flex flex-col rounded-lg border border-solid bg-container px-4 pt-3 pb-3.5 transition-colors ${
        alert ? 'border-warning' : 'border-line'
      } ${offline ? 'opacity-55 grayscale' : ''}`}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary-bg text-primary">
          {config.url ? <img src={config.url} alt="" className="size-4.5 object-contain" /> : <DashboardOutlined />}
        </span>
        <span className="min-w-0 flex-1 truncate text-fg-secondary text-sm" title={name}>
          {name}
        </span>
        {alert ? (
          <span className="shrink-0 rounded bg-warning/15 px-1.5 text-warning text-xs leading-5">
            ⚠ {STATE_HINT[state]}
          </span>
        ) : (
          <span className="shrink-0 text-fg-tertiary text-xs tabular-nums">#{config.channelNum}</span>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={`font-semibold tabular-nums leading-none tracking-tight ${
            noValue ? 'text-fg-tertiary text-xl' : alert ? 'text-[30px] text-warning' : 'text-[30px] text-fg'
          }`}
        >
          {text}
        </span>
        {!noValue && unit && <span className="text-fg-secondary text-sm">{unit}</span>}
      </div>

      <div className="mt-2">
        <Sparkline values={trail} tone={offline ? 'muted' : alert ? 'warning' : 'primary'} />
      </div>

      {position != null ? (
        <Tooltip
          title={`量程 ${formatValue(config.minValue, config.resolution)} ~ ${formatValue(config.maxValue, config.resolution)}${unit ? ` ${unit}` : ''}`}
        >
          <div className="mt-2">
            <div className="relative h-1 rounded-full bg-line">
              <span
                className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-container border-solid ${
                  alert ? 'bg-warning' : 'bg-primary'
                }`}
                style={{ left: `${position * 100}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-fg-tertiary tabular-nums">
              <span>{formatValue(config.minValue, config.resolution)}</span>
              <span>{formatValue(config.maxValue, config.resolution)}</span>
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
