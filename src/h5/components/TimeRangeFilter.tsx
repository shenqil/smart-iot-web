import { Button } from 'antd-mobile'
import { useEffect, useState } from 'react'
import { BIZ_TZ, bizNow, dayjs } from '@/lib/time'
import { parseBizTime } from '../analysisRange'
import { mobileToast } from './feedback'

export function validateRecordRange(start: string, end: string) {
  if (!start && !end) return ''
  const a = parseBizTime(start),
    b = parseBizTime(end)
  if (!a.isValid() || !b.isValid() || !b.isAfter(a)) return '请填写完整有效的时间范围'
  if (a.isBefore(bizNow().subtract(1, 'month').startOf('month'))) return '记录只保留当月与上月'
  if (b.isAfter(bizNow())) return '结束时间不能晚于当前时间'
  return ''
}
const wallTime = (value?: string) => {
  const date = value ? dayjs(value).tz(BIZ_TZ) : null
  return date?.isValid() ? date.format('YYYY-MM-DDTHH:mm') : ''
}
export function TimeFilter({
  start,
  end,
  apply,
}: {
  start?: string
  end?: string
  apply: (start: string, end: string) => void
}) {
  const [a, setA] = useState(() => wallTime(start)),
    [b, setB] = useState(() => wallTime(end))
  useEffect(() => {
    setA(wallTime(start))
    setB(wallTime(end))
  }, [start, end])
  return (
    <section className="h5-time-filter">
      <p className="h5-field-caption">
        发生时间 <span>{BIZ_TZ}</span>
      </p>
      <label className="h5-field">
        开始时间
        <input
          type="datetime-local"
          min={bizNow().subtract(1, 'month').startOf('month').format('YYYY-MM-DDTHH:mm')}
          max={bizNow().format('YYYY-MM-DDTHH:mm')}
          value={a}
          onChange={(e) => setA(e.target.value)}
        />
      </label>
      <label className="h5-field">
        结束时间
        <input
          type="datetime-local"
          value={b}
          max={bizNow().format('YYYY-MM-DDTHH:mm')}
          onChange={(e) => setB(e.target.value)}
        />
      </label>
      <Button
        block
        fill="outline"
        onClick={() => {
          const error = validateRecordRange(a, b)
          if (error) {
            mobileToast.show(error)
            return
          }
          apply(a ? parseBizTime(a).format() : '', b ? parseBizTime(b).format() : '')
        }}
      >
        应用时间
      </Button>
    </section>
  )
}
