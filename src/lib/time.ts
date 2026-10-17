import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/** 业务时区，必须与后端 App.Timezone 一致 */
export const BIZ_TZ = import.meta.env.VITE_BIZ_TZ || 'Asia/Shanghai'

export const bizNow = () => dayjs().tz(BIZ_TZ)
export const fmtDateTime = (v: string | null | undefined) => (v ? dayjs(v).tz(BIZ_TZ).format('YYYY-MM-DD HH:mm') : '—')
export const fmtDate = (v: string | null | undefined) => (v ? dayjs(v).tz(BIZ_TZ).format('YYYY-MM-DD') : '—')

export { dayjs }
