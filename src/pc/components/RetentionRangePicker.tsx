import { DatePicker } from 'antd'
import { bizToPicker, earliestDate, pickerToBiz, type Range } from '@/features/telemetry/export/timeRange'
import { BIZ_TZ, bizNow, dayjs } from '@/lib/time'

export interface RangeValue {
  start: string
  end: string
}

/** RFC3339 → 选择器值 (业务时区墙上时间) */
const toPicker = (v: string) => bizToPicker(dayjs(v).tz(BIZ_TZ))

/**
 * 按天选择时间范围 (告警、操作记录)：只保留当月与上月，更早的日期禁用 (决策 #10)
 * 输出业务时区 RFC3339：开始日 00:00 (含) ~ 结束日次日 00:00 (不含)
 */
export function RetentionRangePicker({
  value,
  onChange,
}: {
  value?: RangeValue
  onChange: (v: RangeValue | undefined) => void
}) {
  const now = bizNow()
  const earliest = bizToPicker(earliestDate())
  const today = bizToPicker(now.endOf('day'))
  const lastMonth = now.subtract(1, 'month')
  const presets: { label: string; value: Range }[] = [
    { label: '今天', value: [bizToPicker(now.startOf('day')), today] },
    { label: '最近 7 天', value: [bizToPicker(now.subtract(6, 'day').startOf('day')), today] },
    { label: '本月', value: [bizToPicker(now.startOf('month')), today] },
    { label: '上月', value: [bizToPicker(lastMonth.startOf('month')), bizToPicker(lastMonth.endOf('month'))] },
  ]
  return (
    <DatePicker.RangePicker
      allowClear
      value={value ? [toPicker(value.start), toPicker(value.end).subtract(1, 'day')] : null}
      presets={presets}
      disabledDate={(d) => d.isBefore(earliest, 'day') || d.isAfter(today, 'day')}
      onChange={(r) => {
        if (!r?.[0] || !r[1]) return onChange(undefined)
        onChange({
          start: pickerToBiz(r[0].startOf('day')).format(),
          end: pickerToBiz(r[1].startOf('day')).add(1, 'day').format(),
        })
      }}
    />
  )
}
