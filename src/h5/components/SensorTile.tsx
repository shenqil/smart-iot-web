import { type AppSensor, type Readings, readSensor } from '@shared/telemetry/lib/realtime'
import { ProgressBar } from 'antd-mobile'
export function SensorTile({
  sensor,
  values,
  online,
}: {
  sensor: AppSensor
  values?: Readings
  online: boolean | undefined
}) {
  const reading = readSensor(sensor, values),
    out = reading.state === 'over' || reading.state === 'under'
  const hint =
    reading.state === 'over'
      ? '超出量程上限'
      : reading.state === 'under'
        ? '低于量程下限'
        : reading.state === 'invalid'
          ? '当前通道无读数'
          : reading.state === 'empty'
            ? '尚未上报'
            : online === undefined
              ? '状态未知 · 上次上报'
              : !online
                ? '最后上报值'
                : `通道 ${sensor.channel}`
  return (
    <article
      className={`h5-sensor ${out ? 'h5-out-of-range' : ''}`}
      aria-label={`${reading.name} ${reading.text} ${sensor.unit ?? ''} ${hint}`}
    >
      <small>{reading.name}</small>
      <div className="h5-reading">
        {reading.text}
        <small>{sensor.unit}</small>
      </div>
      {reading.position != null && (
        <ProgressBar
          percent={reading.position * 100}
          style={{ '--track-width': '4px', '--fill-color': out ? '#c48c45' : '#72a589' }}
        />
      )}
      <small>{hint}</small>
    </article>
  )
}
