import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Portal } from '@/lib/portal'

/** 数据端"我的关注"设备 (名称为关注时的快照，设备树未加载该园区时显示) */
export interface FavoriteDevice {
  siteId: number
  deviceId: number
  name: string
}

/** 本机偏好 (只影响体验，不影响权限) */
interface PrefState {
  lastPortal: Portal | null
  lastCompanyId: number | null
  siderCollapsed: boolean
  scopeTreeCollapsed: boolean
  /** 按企业 ID 分开保存 */
  favorites: Record<string, FavoriteDevice[]>
  toggleFavorite: (companyId: number, d: FavoriteDevice) => void
  remember: (portal: Portal, companyId: number | null) => void
  setSiderCollapsed: (v: boolean) => void
  setScopeTreeCollapsed: (v: boolean) => void
}

export const usePref = create<PrefState>()(
  persist(
    (set) => ({
      lastPortal: null,
      lastCompanyId: null,
      siderCollapsed: false,
      scopeTreeCollapsed: false,
      favorites: {},
      toggleFavorite: (companyId, d) =>
        set((s) => {
          const list = s.favorites[companyId] ?? []
          const exists = list.some((f) => f.deviceId === d.deviceId && f.siteId === d.siteId)
          return {
            favorites: {
              ...s.favorites,
              [companyId]: exists
                ? list.filter((f) => !(f.deviceId === d.deviceId && f.siteId === d.siteId))
                : [...list, d],
            },
          }
        }),
      remember: (lastPortal, companyId) => set((s) => ({ lastPortal, lastCompanyId: companyId ?? s.lastCompanyId })),
      setSiderCollapsed: (siderCollapsed) => set({ siderCollapsed }),
      setScopeTreeCollapsed: (scopeTreeCollapsed) => set({ scopeTreeCollapsed }),
    }),
    { name: 'siot.pref', storage: createJSONStorage(() => localStorage) },
  ),
)
