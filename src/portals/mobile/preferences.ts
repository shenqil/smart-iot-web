import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DeviceBookmark {
  id: number
  name: string
  siteId?: number
}
interface State {
  entries: Record<string, { favorites: DeviceBookmark[]; recent: DeviceBookmark[] }>
  toggle: (userId: number, companyId: number, device: DeviceBookmark) => void
  visit: (userId: number, companyId: number, device: DeviceBookmark) => void
}
export const preferenceKey = (userId: number, companyId: number) => `${userId}:${companyId}`
export const useMobilePreferences = create<State>()(
  persist(
    (set) => ({
      entries: {},
      toggle: (uid, cid, device) =>
        set((s) => {
          const key = preferenceKey(uid, cid),
            entry = s.entries[key] ?? { favorites: [], recent: [] }
          const exists = entry.favorites.some((d) => d.id === device.id)
          return {
            entries: {
              ...s.entries,
              [key]: {
                ...entry,
                favorites: exists ? entry.favorites.filter((d) => d.id !== device.id) : [...entry.favorites, device],
              },
            },
          }
        }),
      visit: (uid, cid, device) =>
        set((s) => {
          const key = preferenceKey(uid, cid),
            entry = s.entries[key] ?? { favorites: [], recent: [] }
          return {
            entries: {
              ...s.entries,
              [key]: { ...entry, recent: [device, ...entry.recent.filter((d) => d.id !== device.id)].slice(0, 20) },
            },
          }
        }),
    }),
    { name: 'siot.mobile.preferences.v1' },
  ),
)
