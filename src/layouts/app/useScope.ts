import { useSearchParams } from 'react-router'

/** 数据端全局范围：设备树的选中项，写在 URL 上 (FRONTEND_DESIGN §5.1) */
export function useScope() {
  const [params, setParams] = useSearchParams()
  const num = (k: string) => {
    const v = Number(params.get(k))
    return Number.isInteger(v) && v > 0 ? v : null
  }
  const siteId = num('siteId')
  const deviceId = siteId ? num('deviceId') : null

  const select = (next: { siteId: number | null; deviceId?: number | null }) => {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        // 范围变化时清掉分页等页面参数，只保留范围
        for (const k of [...p.keys()]) if (k !== 'tab') p.delete(k)
        if (next.siteId) p.set('siteId', String(next.siteId))
        if (next.siteId && next.deviceId) p.set('deviceId', String(next.deviceId))
        return p
      },
      { replace: false },
    )
  }

  /** 生成保留范围的链接 (模块间切换时使用) */
  const scopeSearch = () => {
    const p = new URLSearchParams()
    if (siteId) p.set('siteId', String(siteId))
    if (deviceId) p.set('deviceId', String(deviceId))
    const s = p.toString()
    return s ? `?${s}` : ''
  }

  return { siteId, deviceId, select, scopeSearch }
}
