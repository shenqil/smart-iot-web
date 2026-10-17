import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Portal } from '@/lib/portal'

/** 本机偏好 (只影响体验，不影响权限) */
interface PrefState {
  lastPortal: Portal | null
  lastCompanyId: number | null
  siderCollapsed: boolean
  scopeTreeCollapsed: boolean
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
      remember: (lastPortal, companyId) => set((s) => ({ lastPortal, lastCompanyId: companyId ?? s.lastCompanyId })),
      setSiderCollapsed: (siderCollapsed) => set({ siderCollapsed }),
      setScopeTreeCollapsed: (scopeTreeCollapsed) => set({ scopeTreeCollapsed }),
    }),
    { name: 'siot.pref', storage: createJSONStorage(() => localStorage) },
  ),
)
