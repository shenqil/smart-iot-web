import { create } from 'zustand'
import { useSession } from './session'

/**
 * 前端系统配置 (后端 sys_configs 表 key = "frontend"，平台管理 › 系统配置 维护)。
 * 新增配置项时在这里加字段，并在 parseFrontendConfig 中给出默认值。
 */
export interface FrontendConfig {
  tianditu: {
    /** 天地图浏览器端 Key (绑定域名，用于瓦片) */
    browserKey: string
  }
}

/** 前端系统配置的 key (与后端 entity.SysConfigKeyFrontend 一致) */
export const FRONTEND_CONFIG_KEY = 'frontend'

export const DEFAULT_FRONTEND_CONFIG: FrontendConfig = { tianditu: { browserKey: '' } }

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** 解析配置值 (JSON 字符串，后端不校验)：非法 JSON 或字段缺失 / 类型不对时使用默认值，不抛异常 */
export function parseFrontendConfig(raw: string | null | undefined): FrontendConfig {
  let v: unknown
  try {
    v = raw ? JSON.parse(raw) : {}
  } catch {
    return DEFAULT_FRONTEND_CONFIG
  }
  const root = isObject(v) ? v : {}
  const tdt = isObject(root.tianditu) ? root.tianditu : {}
  return { tianditu: { browserKey: str(tdt.browserKey) } }
}

export type SysConfigStatus = 'idle' | 'loading' | 'ready' | 'error'

interface SysConfigState {
  frontend: FrontendConfig
  status: SysConfigStatus
  /** 已加载配置对应的令牌 (换账号 / 重新登录后需重新加载) */
  token: string | null
  setLoading: (token: string) => void
  setFrontend: (token: string, raw: string | null) => void
  setError: (token: string) => void
  clear: () => void
}

/** 系统配置 (只在内存中，不持久化)：登录后由 loadFrontendConfig 加载，退出登录 / 令牌变化时清空 */
export const useSysConfig = create<SysConfigState>()((set) => ({
  frontend: DEFAULT_FRONTEND_CONFIG,
  status: 'idle',
  token: null,
  setLoading: (token) => set({ status: 'loading', token }),
  setFrontend: (token, raw) => set({ frontend: parseFrontendConfig(raw), status: 'ready', token }),
  setError: (token) => set({ frontend: DEFAULT_FRONTEND_CONFIG, status: 'error', token }),
  clear: () => set({ frontend: DEFAULT_FRONTEND_CONFIG, status: 'idle', token: null }),
}))

// 令牌变化 (退出登录、过期、其他标签页切换账号) 时清空，避免沿用上一个会话的配置
useSession.subscribe((s, prev) => {
  if (s.token !== prev.token) useSysConfig.getState().clear()
})

/** 天地图浏览器端 Key (未配置时为空串) */
export const useTdtBrowserKey = () => useSysConfig((s) => s.frontend.tianditu.browserKey)
