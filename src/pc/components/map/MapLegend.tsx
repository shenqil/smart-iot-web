import type { CSSProperties } from 'react'
import type { MarkerTheme } from './markers'

export type LegendItem = 'online' | 'offline' | 'alarm' | 'selected' | 'cluster' | 'site'

const PIN: Record<'online' | 'offline' | 'alarm' | 'selected', { bg: string; ring?: boolean; label: string }> = {
  online: { bg: '#06b6d4', label: '在线' },
  offline: { bg: '#64748b', label: '离线' },
  alarm: { bg: '#ef4444', label: '告警' },
  selected: { bg: '#06b6d4', ring: true, label: '当前设备' },
}

/** 地图图例 (标点规范见 markers.ts) */
export function MapLegend({
  items,
  theme,
  className = '',
  style,
}: {
  items: LegendItem[]
  theme: MarkerTheme
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={`siot-legend siot-legend--${theme} ${className}`} style={style}>
      {items.map((k) => {
        if (k === 'cluster')
          return (
            <span key={k} className="siot-legend__item">
              <span className="siot-legend__clu" />
              聚合
            </span>
          )
        if (k === 'site')
          return (
            <span key={k} className="siot-legend__item">
              <span className="siot-legend__site" />
              园区
            </span>
          )
        const p = PIN[k]
        return (
          <span key={k} className="siot-legend__item">
            <span
              className="siot-legend__pin"
              style={{ background: p.bg, boxShadow: p.ring ? '0 0 0 2px #facc15' : undefined }}
            />
            {p.label}
          </span>
        )
      })}
    </div>
  )
}
