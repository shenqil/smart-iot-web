import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface SessionState {
  token: string | null
  /** RFC3339，令牌过期时间 (后端 Auth.TokenTTL，默认 12h，无续期) */
  expiresAt: string | null
  setSession: (token: string, expiresAt: string) => void
  clear: () => void
}

export const SESSION_STORAGE_KEY = 'siot.session'

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      expiresAt: null,
      setSession: (token, expiresAt) => set({ token, expiresAt }),
      clear: () => set({ token: null, expiresAt: null }),
    }),
    { name: SESSION_STORAGE_KEY, storage: createJSONStorage(() => localStorage) },
  ),
)

export const isExpired = (expiresAt: string | null, now = Date.now()) =>
  !expiresAt || new Date(expiresAt).getTime() <= now

export const hasValidSession = () => {
  const { token, expiresAt } = useSession.getState()
  return Boolean(token) && !isExpired(expiresAt)
}
