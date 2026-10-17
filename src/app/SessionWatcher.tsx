import { useEffect } from 'react'
import { SESSION_STORAGE_KEY, useSession } from '@/stores/session'
import { currentPath, loginPath, navigateTo } from './navigation'
import { notify } from './notify'
import { expireSession, queryClient } from './queryClient'

const WARN_BEFORE = 5 * 60_000

/** 令牌到期提醒与多标签页同步 (FRONTEND_DESIGN §1.4) */
export function SessionWatcher() {
  const expiresAt = useSession((s) => s.expiresAt)

  useEffect(() => {
    if (!expiresAt) return
    const left = new Date(expiresAt).getTime() - Date.now()
    const timers: number[] = []
    if (left > WARN_BEFORE) {
      timers.push(window.setTimeout(() => notify.warning('登录将在 5 分钟后过期，请及时保存'), left - WARN_BEFORE))
    }
    timers.push(window.setTimeout(() => expireSession(), Math.max(left, 0)))
    return () => timers.forEach(clearTimeout)
  }, [expiresAt])

  useEffect(() => {
    const onStorage = async (e: StorageEvent) => {
      if (e.key !== SESSION_STORAGE_KEY) return
      const before = useSession.getState().token
      await useSession.persist.rehydrate()
      const after = useSession.getState().token
      if (before === after) return
      queryClient.clear()
      if (!after) {
        if (!window.location.pathname.startsWith('/login')) navigateTo(loginPath(currentPath()), { replace: true })
      } else {
        navigateTo('/', { replace: true }) // 其他标签页切换了账号
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return null
}
