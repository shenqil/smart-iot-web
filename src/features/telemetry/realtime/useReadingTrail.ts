import { useEffect, useState } from 'react'
import { isValidReading } from '@/lib/resolution'

/** 迷你图保留的点数 (FRONTEND_DESIGN §5.3：最近 60 个点，只在内存，离开即丢弃) */
export const TRAIL_SIZE = 60

/**
 * 每次实时数据的采集时间变化时，把各通道的值追加到环形缓冲；无读数的点跳过
 * 返回 通道号 → 最近的值
 */
export function useReadingTrail(sensors: readonly number[] | null | undefined, at: string | null | undefined) {
  const [trail, setTrail] = useState<{ at: string | null; data: Record<number, number[]> }>({ at: null, data: {} })
  useEffect(() => {
    if (!sensors || !at) return
    setTrail((prev) => {
      if (prev.at === at) return prev
      const data: Record<number, number[]> = {}
      sensors.forEach((v, ch) => {
        const list = prev.data[ch] ?? []
        data[ch] = isValidReading(v) ? [...list, v].slice(-TRAIL_SIZE) : list
      })
      return { at, data }
    })
  }, [sensors, at])
  return trail.data
}
