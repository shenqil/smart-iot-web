import { type DivIcon, divIcon } from 'leaflet'
import './markers.css'

/**
 * 地图标点 (FRONTEND_DESIGN §6.1)：设备定位针、园区方牌、聚合、选点针
 * - 大屏 (影像底图) 用 dark 主题标签，管理端 / 数据端 (矢量底图) 用 light 主题标签
 * - 状态同时用颜色、角标、文字区分：在线 青色 / 离线 灰色 + ○ / 告警 红色 + 数量 + 地面光圈 / 选中 放大 + 金环
 * - 图标是 Leaflet DivIcon (HTML 字符串)，名称等用户内容一律转义
 */

export type MarkerTheme = 'light' | 'dark'

export type DeviceGlyphKind = 'gateway' | 'soil' | 'weather' | 'lamp' | 'camera' | 'valve' | 'device'

const GLYPHS: Record<DeviceGlyphKind | 'site' | 'pick', string> = {
  gateway: '<path d="M3 20V10l9-6 9 6v10"/><path d="M3 20h18M9 20v-6h6v6"/>',
  soil: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
  weather: '<path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.5 3.5 0 1 1 17 18Z"/>',
  lamp: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3Z"/>',
  camera: '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="m16 11 5-3v8l-5-3"/>',
  valve: '<path d="M3 12h18M12 12V6M8 6h8"/><circle cx="12" cy="12" r="3.5"/>',
  device:
    '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  site: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>',
  pick: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
}

const svg = (kind: keyof typeof GLYPHS, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPHS[kind]}</svg>`

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c])

/** 按设备类型名称选内置图标 (字典没有配置图标时使用) */
export function deviceGlyphKind(typeName: string | null | undefined): DeviceGlyphKind {
  if (!typeName) return 'device'
  if (/视频|摄像/.test(typeName)) return 'camera'
  if (/墒情|土壤/.test(typeName)) return 'soil'
  if (/气象/.test(typeName)) return 'weather'
  if (/杀虫|虫情|诱捕/.test(typeName)) return 'lamp'
  if (/水肥|阀|灌溉|泵|卷帘|卷膜|控制器/.test(typeName)) return 'valve'
  if (/网关|温室|大棚/.test(typeName)) return 'gateway'
  return 'device'
}

export type DeviceMarkerState = 'online' | 'offline' | 'alarm'

export const deviceMarkerState = (d: { online: boolean; alarms: number }): DeviceMarkerState =>
  d.alarms > 0 ? 'alarm' : d.online ? 'online' : 'offline'

const STATE_TEXT: Record<DeviceMarkerState, string> = { online: '在线', offline: '离线', alarm: '告警' }

export interface DeviceMarkerOptions {
  name: string
  online: boolean
  /** 未处理告警数 */
  alarms: number
  kind: DeviceGlyphKind
  /** 字典里的设备类型图标 (着色为白色显示在针体上)；不传用内置图标 */
  iconUrl?: string
  selected?: boolean
  theme: MarkerTheme
}

/** 标点悬浮提示 / 读屏文字：名称 + 状态 */
export const deviceMarkerTitle = (o: Pick<DeviceMarkerOptions, 'name' | 'online' | 'alarms'>) => {
  const s = deviceMarkerState(o)
  return `${o.name} · ${s === 'alarm' ? `${o.alarms} 条未处理告警` : STATE_TEXT[s]}`
}

/** 设备定位针：锚点在针尖；告警、选中时名称常驻，其余在缩放 ≥ 15 级时显示 (见 ZoomLabels) */
export function deviceMarkerIcon(o: DeviceMarkerOptions): DivIcon {
  const state = deviceMarkerState(o)
  const cls = ['siot-mk', `siot-mk--${o.theme}`, `is-${state}`, o.selected ? 'is-sel' : ''].filter(Boolean).join(' ')
  const glyph = o.iconUrl ? `<img src="${escapeHtml(o.iconUrl)}" alt="">` : svg(o.kind, o.selected ? 22 : 18)
  const rings = o.selected
    ? '<span class="siot-mk__ring is-gold"></span><span class="siot-mk__ring is-gold is-late"></span>'
    : state === 'alarm'
      ? '<span class="siot-mk__ring"></span><span class="siot-mk__ring is-late"></span>'
      : ''
  const badge =
    state === 'alarm'
      ? `<span class="siot-mk__badge">${o.alarms > 99 ? '99+' : o.alarms}</span>`
      : state === 'offline'
        ? '<span class="siot-mk__badge is-off">○</span>'
        : ''
  const st = state === 'online' ? '' : `<span class="siot-mk__st">${STATE_TEXT[state]}</span>`
  return divIcon({
    className: cls,
    html: `${rings}<span class="siot-mk__gnd"></span><span class="siot-mk__pin"><span class="siot-mk__glyph">${glyph}</span></span>${badge}<span class="siot-mk__lbl">${escapeHtml(o.name)}${st}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, o.selected ? -60 : -50],
    tooltipAnchor: [0, o.selected ? -60 : -50],
  })
}

export type SiteMarkerStatus = 'active' | 'under_construction' | 'inactive' | string

const SITE_STATUS_TEXT: Record<string, string> = { active: '运营中', under_construction: '建设中', inactive: '已停用' }

export interface SiteMarkerOptions {
  name: string
  status: SiteMarkerStatus
  /** 在线数 / 设备数 (不传时副标题显示园区状态) */
  online?: number
  total?: number
  alarms?: number
  theme: MarkerTheme
}

/** 园区方牌：与设备定位针形状不同，名称常驻；运营中 青色 / 建设中 橙色斜纹 / 停用 灰色 */
export function siteMarkerIcon(o: SiteMarkerOptions): DivIcon {
  const status = SITE_STATUS_TEXT[o.status] ? o.status : 'inactive'
  const sub =
    o.total != null && status === 'active'
      ? `<b>${o.online ?? 0}/${o.total}</b> 在线${o.alarms ? ` · <em>告警 ${o.alarms}</em>` : ''}`
      : SITE_STATUS_TEXT[status]
  return divIcon({
    className: `siot-site siot-site--${o.theme} is-${status}`,
    html: `<span class="siot-site__card"><span class="siot-site__ico">${svg('site')}</span><span class="siot-site__txt"><span class="siot-site__name">${escapeHtml(o.name)}</span><span class="siot-site__sub">${sub}</span></span></span><span class="siot-site__tip"></span><span class="siot-mk__gnd"></span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -70],
  })
}

export const siteMarkerTitle = (o: Pick<SiteMarkerOptions, 'name' | 'status'>) =>
  `${o.name} · ${SITE_STATUS_TEXT[o.status] ?? o.status}`

/** 聚合：数字为设备数；内含告警设备时外圈变红 */
export function clusterIcon(count: number, hasAlarm: boolean): DivIcon {
  return divIcon({
    className: `siot-clu${hasAlarm ? ' is-al' : ''}`,
    html: `<span>${count > 999 ? '999+' : count}</span>`,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  })
}

/** 地图选点 (表单)：主色定位针 */
export function pickMarkerIcon(): DivIcon {
  return divIcon({
    className: 'siot-mk siot-mk--light is-pick is-sel-lite',
    html: `<span class="siot-mk__gnd"></span><span class="siot-mk__pin"><span class="siot-mk__glyph">${svg('pick')}</span></span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}
