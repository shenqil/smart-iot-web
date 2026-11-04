import { useEffect, useState } from 'react'

/** 当前时间，按间隔刷新 (用于"8 秒前更新"等相对时间) */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
