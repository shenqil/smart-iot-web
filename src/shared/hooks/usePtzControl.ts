import { controlPTZ } from '@shared/api/camera'
import { useCallback, useEffect, useRef, useState } from 'react'

export type Speed = 0 | 1 | 2

export interface UsePtzControlOptions {
  companyId: number
  deviceId: number
  initialSpeed?: Speed
  control?: typeof controlPTZ
  onError?: (error: unknown, action: 'start' | 'stop') => void
}

export interface UsePtzControlReturn {
  active: number | null
  locked: boolean
  speed: Speed
  setSpeed: (speed: Speed) => void
  uncertain: number | null
  start: (direction: number) => void
  stop: () => Promise<void>
  retryStop: () => Promise<void>
  bindDirection: (direction: number) => {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void
    onPointerUp: () => void
    onPointerCancel: () => void
    onLostPointerCapture: () => void
    onKeyDown: (e: React.KeyboardEvent) => void
    onKeyUp: (e: React.KeyboardEvent) => void
    onContextMenu: (e: React.MouseEvent) => void
  }
}

/**
 * 云台控制状态机 Hook (PC & H5 共享)
 * - start/stop 严格串行保证，解决弱网快点下的并发乱序死转问题
 * - 松开后锁定 1s (1000ms)，并在 500ms 与 900ms 分别补充调用两次 stop 兜底
 * - 页面失焦 (blur)、切后台 (visibilitychange)、组件卸载时强制刹车
 * - 支持停止失败后的 uncertain 状态标记与重试
 */
export function usePtzControl({
  companyId,
  deviceId,
  initialSpeed = 1,
  control = controlPTZ,
  onError,
}: UsePtzControlOptions): UsePtzControlReturn {
  const [speed, setSpeed] = useState<Speed>(initialSpeed)
  const [active, setActive] = useState<number | null>(null)
  const [locked, setLocked] = useState(false)
  const [uncertain, setUncertain] = useState<number | null>(null)

  const activeRef = useRef<number | null>(null)
  const lockedRef = useRef(false)
  const speedRef = useRef<Speed>(speed)
  speedRef.current = speed

  const controlRef = useRef(control)
  controlRef.current = control

  const moveRef = useRef<{ direction: number; start: Promise<unknown>; speed: Speed } | null>(null)
  const aliveRef = useRef(true)
  const stoppingRef = useRef(false)

  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimer1Ref = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current)
      lockTimerRef.current = null
    }
    if (retryTimer1Ref.current) {
      clearTimeout(retryTimer1Ref.current)
      retryTimer1Ref.current = null
    }
    if (retryTimer2Ref.current) {
      clearTimeout(retryTimer2Ref.current)
      retryTimer2Ref.current = null
    }
  }, [])

  const startLock = useCallback(() => {
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current)
    }
    setLocked(true)
    lockedRef.current = true
    lockTimerRef.current = setTimeout(() => {
      lockTimerRef.current = null
      lockedRef.current = false
      if (aliveRef.current) setLocked(false)
    }, 1000)
  }, [])

  const stop = useCallback(async () => {
    const current = moveRef.current
    if (!current) return
    moveRef.current = null
    activeRef.current = null
    stoppingRef.current = true
    if (aliveRef.current) setActive(null)

    // 松开后所有按钮锁住 1000ms
    startLock()

    // 清除先前的 retry 定时器
    if (retryTimer1Ref.current) {
      clearTimeout(retryTimer1Ref.current)
      retryTimer1Ref.current = null
    }
    if (retryTimer2Ref.current) {
      clearTimeout(retryTimer2Ref.current)
      retryTimer2Ref.current = null
    }

    try {
      // 启动请求完成后才能发送停止，避免弱网下指令倒序
      await current.start.catch(() => {})
      const r = await controlRef.current(companyId, deviceId, {
        action: 'stop',
        direction: current.direction,
        speed: current.speed,
      })
      if (r?.error) throw r.error
      if (aliveRef.current) setUncertain(null)
    } catch (e) {
      if (aliveRef.current) setUncertain(current.direction)
      onError?.(e, 'stop')
    } finally {
      stoppingRef.current = false
    }

    // 停止间隔 500ms 后补充调用一次 stop
    retryTimer1Ref.current = setTimeout(async () => {
      retryTimer1Ref.current = null
      if (moveRef.current == null && aliveRef.current) {
        try {
          await controlRef.current(companyId, deviceId, {
            action: 'stop',
            direction: current.direction,
            speed: current.speed,
          })
        } catch {
          // 补充 stop 静默处理
        }
      }
    }, 500)

    // 停止间隔 900ms 后再次补充调用一次 stop
    retryTimer2Ref.current = setTimeout(async () => {
      retryTimer2Ref.current = null
      if (moveRef.current == null && aliveRef.current) {
        try {
          await controlRef.current(companyId, deviceId, {
            action: 'stop',
            direction: current.direction,
            speed: current.speed,
          })
        } catch {
          // 补充 stop 静默处理
        }
      }
    }, 900)
  }, [companyId, deviceId, onError, startLock])

  const start = useCallback(
    (direction: number) => {
      if (lockedRef.current || moveRef.current || stoppingRef.current || uncertain !== null || document.hidden) return

      if (retryTimer1Ref.current) {
        clearTimeout(retryTimer1Ref.current)
        retryTimer1Ref.current = null
      }
      if (retryTimer2Ref.current) {
        clearTimeout(retryTimer2Ref.current)
        retryTimer2Ref.current = null
      }

      activeRef.current = direction
      setActive(direction)

      const request = controlRef
        .current(companyId, deviceId, {
          action: 'start',
          direction,
          speed: speedRef.current,
        })
        .then((r) => {
          if (r?.error) throw r.error
        })
        .catch((e) => {
          onError?.(e, 'start')
        })

      moveRef.current = { direction, start: request, speed: speedRef.current }
    },
    [companyId, deviceId, onError, uncertain],
  )

  const retryStop = useCallback(async () => {
    if (uncertain === null) return
    try {
      const r = await controlRef.current(companyId, deviceId, {
        action: 'stop',
        direction: uncertain,
        speed: speedRef.current,
      })
      if (r?.error) throw r.error
      if (aliveRef.current) setUncertain(null)
    } catch (e) {
      onError?.(e, 'stop')
    }
  }, [companyId, deviceId, onError, uncertain])

  useEffect(() => {
    aliveRef.current = true
    const handleBlur = () => {
      void stop()
    }
    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleBlur)

    return () => {
      aliveRef.current = false
      clearTimers()
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleBlur)
      void stop()
    }
  }, [stop, clearTimers])

  const bindDirection = useCallback(
    (direction: number) => ({
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        if (lockedRef.current || e.button !== 0) return
        e.preventDefault?.()
        e.currentTarget.setPointerCapture?.(e.pointerId)
        start(direction)
      },
      onPointerUp: () => {
        void stop()
      },
      onPointerCancel: () => {
        void stop()
      },
      onLostPointerCapture: () => {
        void stop()
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (lockedRef.current) return
        if (['Enter', ' '].includes(e.key) && !e.repeat) {
          e.preventDefault()
          start(direction)
        }
      },
      onKeyUp: (e: React.KeyboardEvent) => {
        if (['Enter', ' '].includes(e.key)) void stop()
      },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    }),
    [start, stop],
  )

  return {
    active,
    locked,
    speed,
    setSpeed,
    uncertain,
    start,
    stop,
    retryStop,
    bindDirection,
  }
}
