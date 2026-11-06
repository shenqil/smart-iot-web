import { useCallback, useEffect, useRef, useState } from 'react'

export const DEFAULT_CHECK_INTERVAL_MS = 10 * 60 * 1000 // 10分钟
export const DEFAULT_COUNTDOWN_SECONDS = 10

/**
 * 无缓存方式请求 version.txt 文件
 */
export async function fetchVersion(isDev = import.meta.env.DEV): Promise<string | null> {
  try {
    const url = `/version.txt?t=${Date.now()}`
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    })

    if (!response.ok) {
      if (isDev) return null
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const timestamp = await response.text()
    return timestamp.trim()
  } catch (error) {
    if (isDev) return null
    console.error('Failed to fetch version:', error)
    return null
  }
}

/**
 * 检查版本是否更新
 */
export async function checkVersion(
  currentTimestamp = typeof window !== 'undefined' ? window.__BUILD_TIMESTAMP__ : undefined,
  isDev = import.meta.env.DEV,
): Promise<boolean> {
  const newTimestamp = await fetchVersion(isDev)

  if (!newTimestamp) return false
  if (!currentTimestamp) return false

  return newTimestamp !== currentTimestamp
}

export interface UseVersionCheckOptions {
  checkIntervalMs?: number
  countdownSeconds?: number
  enabled?: boolean
  onReload?: () => void
}

export function useVersionCheck(options: UseVersionCheckOptions = {}) {
  const {
    checkIntervalMs = DEFAULT_CHECK_INTERVAL_MS,
    countdownSeconds = DEFAULT_COUNTDOWN_SECONDS,
    enabled = !import.meta.env.DEV,
    onReload,
  } = options

  const [visible, setVisible] = useState(false)
  const [countdown, setCountdown] = useState(countdownSeconds)

  const reload = useCallback(() => {
    if (onReload) {
      onReload()
      return
    }
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }, [onReload])

  const checkRef = useRef(false)
  const hasTriggeredRef = useRef(false)

  const triggerUpdate = useCallback(() => {
    if (hasTriggeredRef.current) return
    hasTriggeredRef.current = true
    setVisible(true)
    setCountdown(countdownSeconds)
  }, [countdownSeconds])

  // 定时倒计时
  useEffect(() => {
    if (!visible) return

    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer)
          reload()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [visible, reload])

  // 版本轮询
  useEffect(() => {
    if (!enabled) return

    const doCheck = async () => {
      if (checkRef.current || hasTriggeredRef.current) return
      checkRef.current = true
      try {
        const hasUpdate = await checkVersion()
        if (hasUpdate) {
          triggerUpdate()
        }
      } finally {
        checkRef.current = false
      }
    }

    // 页面加载时立即检查一次
    void doCheck()

    // 周期轮询
    const intervalTimer = window.setInterval(doCheck, checkIntervalMs)

    return () => {
      window.clearInterval(intervalTimer)
    }
  }, [enabled, checkIntervalMs, triggerUpdate])

  return {
    visible,
    countdown,
    reload,
  }
}
