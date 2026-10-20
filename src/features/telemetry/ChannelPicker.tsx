import { Tag } from 'antd'
import { type AppSensor, channelName } from './lib/realtime'

/** 通道选择 (历史曲线、环比共用)：可多选，至少保留一个 */
export function ChannelPicker({
  sensors,
  value,
  onChange,
}: {
  sensors: AppSensor[]
  value: number[]
  onChange: (v: number[]) => void
}) {
  const toggle = (ch: number, checked: boolean) => {
    if (checked) onChange(sensors.map((s) => s.channelNum).filter((c) => c === ch || value.includes(c)))
    else if (value.length > 1) onChange(value.filter((c) => c !== ch))
  }
  return (
    <div className="flex flex-wrap items-center gap-y-2">
      <span className="mr-2 text-fg-secondary text-sm">通道</span>
      {sensors.map((s) => (
        <Tag.CheckableTag
          key={s.channelNum}
          checked={value.includes(s.channelNum)}
          onChange={(c) => toggle(s.channelNum, c)}
          className="border border-line border-solid"
        >
          {channelName(s)}
          {s.unit?.trim() && <span className="ml-1 opacity-70">{s.unit}</span>}
        </Tag.CheckableTag>
      ))}
    </div>
  )
}
