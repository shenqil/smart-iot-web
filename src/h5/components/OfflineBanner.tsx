import { queryClient } from '@shared/queryClient'
import { useEffect, useState } from 'react'

export interface OfflineBannerProps {
  /** 离线时的自定义提示 */
  offlineText?: string
  /** 恢复联网时的自定义提示 */
  onlineText?: string
  /** 联网恢复后自动隐藏的毫秒数，默认 2500ms */
  dismissDelayMs?: number
  /** 自定义联网恢复回调 (默认 invalidateQueries) */
  onReconnect?: () => void
}

/**
 * 离线与弱网状态提示横幅：
 * 移动端 IoT 现场运维在配电房/地下室常面临断网弱网。
 * 该横幅在断网时明确告知正在使用离线缓存，并在重连时自动同步最新遥测/告警数据。
 */
export function OfflineBanner({
  offlineText = '网络已断开，正在使用离线缓存数据',
  onlineText = '网络已恢复，正在同步最新数据…',
  dismissDelayMs = 2500,
  onReconnect,
}: OfflineBannerProps) {
  const [status, setStatus] = useState<'online' | 'offline' | 'restored'>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online',
  )

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    const handleOffline = () => {
      if (timer) clearTimeout(timer)
      setStatus('offline')
    }

    const handleOnline = () => {
      setStatus('restored')
      if (onReconnect) {
        onReconnect()
      } else {
        void queryClient.invalidateQueries()
      }
      timer = setTimeout(() => {
        setStatus('online')
      }, dismissDelayMs)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [dismissDelayMs, onReconnect])

  if (status === 'online') {
    return null
  }

  const isRestored = status === 'restored'

  return (
    <aside
      className={`h5-offline-banner ${isRestored ? 'h5-offline-restored' : 'h5-offline-disconnected'}`}
      role="status"
      aria-live="polite"
    >
      <span className="h5-offline-dot" aria-hidden="true" />
      <span className="h5-offline-text">{isRestored ? onlineText : offlineText}</span>
    </aside>
  )
}
