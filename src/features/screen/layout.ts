/**
 * 大屏卡片编排 (FRONTEND_DESIGN §5.7)
 *
 * 设计基准 1920 × 1080。按宽、高中较小的比例等比缩放后，画布的逻辑尺寸随屏幕比例变化
 * (16:10 屏更高、带鱼屏更宽)，卡片始终贴住左、右、下边：
 * - 左栏、右栏固定宽度，分别贴左、右边；高度铺满顶栏以下，各卡片按设计稿比例等比伸缩
 * - 底部卡片贴下边，宽度占满两栏之间，高度同比例伸缩
 *
 * 左栏 3 张、右上「设备信息」固定，其余按当前设备的通道配置与园区有无摄像头出现：
 * - 右侧 2 个槽位，按 实时数据 → 实时监控 → 操作记录 依次填入，填满后其余省略；没填满时空着 (露出地图)
 * - 底部按 今日曲线 → 继电器控制 排列；只有一张时占满宽度；都没有时隐藏底部
 */

export const DESIGN_W = 1920
export const DESIGN_H = 1080
export const HEADER_H = 84

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

/** 外边距、卡片间距、栏宽 (逻辑像素，随整体缩放) */
const EDGE = 20
const GAP = 12
const COL_W = 440
const COL_TOP = HEADER_H + GAP
/** 设计稿 (1080 高) 中各卡片的高度：左栏 300 / 300 / 340，底部 280；屏幕更高时按比例放大 */
const LEFT_H = [300, 300, 340] as const
const BOTTOM_H = 280
const DESIGN_COL_H = LEFT_H[0] + LEFT_H[1] + LEFT_H[2]
/** 底部两张并排时 曲线 : 继电器 = 588 : 368 */
const TREND_RATIO = 588 / (588 + 368)

export type RightCard = 'realtime' | 'camera' | 'operations'
export type BottomCard = 'trend' | 'relay'

export interface ScreenLayout {
  /** 画布逻辑尺寸 (≥ 1920 × 1080 中的一边) */
  width: number
  height: number
  fixed: { weather: Rect; deviceTypes: Rect; alarms: Rect; deviceInfo: Rect }
  right: { card: RightCard; rect: Rect }[]
  bottom: { card: BottomCard; rect: Rect }[]
  /** 因槽位已满而省略的卡片 (操作记录省略时继电器卡片给入口) */
  omitted: RightCard[]
  /** 底部区域的顶边 (隐藏时为 null)；图例、地图视野据此避让 */
  bottomTop: number | null
  /** 两栏之间的地图可见区域 (左右边界与顶边) */
  mapSafe: { left: number; right: number; top: number }
}

export interface ScreenFeatures {
  sensors: boolean
  relays: boolean
  cameras: boolean
}

export function computeLayout(width: number, height: number, f: ScreenFeatures): ScreenLayout {
  const colBottom = height - EDGE
  // 栏内可用高度 (扣除两道间距) 相对设计稿的伸缩比例
  const k = (colBottom - COL_TOP - GAP * 2) / DESIGN_COL_H
  const h0 = Math.round(LEFT_H[0] * k)
  const h1 = Math.round(LEFT_H[1] * k)
  const leftX = EDGE
  const rightX = width - EDGE - COL_W
  const col = (top: number, h: number, x: number): Rect => ({ left: x, top, width: COL_W, height: h })

  const top1 = COL_TOP + h0 + GAP
  const top2 = top1 + h1 + GAP
  const fixed = {
    weather: col(COL_TOP, h0, leftX),
    deviceTypes: col(top1, h1, leftX),
    alarms: col(top2, colBottom - top2, leftX),
    deviceInfo: col(COL_TOP, h0, rightX),
  }

  const queue: RightCard[] = []
  if (f.sensors) queue.push('realtime')
  if (f.cameras) queue.push('camera')
  if (f.relays) queue.push('operations')
  // 右侧两个槽位平分设备信息以下的高度
  const slotTop = COL_TOP + h0 + GAP
  const slotH = Math.floor((colBottom - slotTop - GAP) / 2)
  const right = queue.slice(0, 2).map((card, i) => ({
    card,
    rect: col(i === 0 ? slotTop : colBottom - slotH, slotH, rightX),
  }))

  const cards: BottomCard[] = []
  if (f.sensors) cards.push('trend')
  if (f.relays) cards.push('relay')
  const bottomX = leftX + COL_W + 16
  const bottomW = rightX - 16 - bottomX
  const bottomH = Math.round(BOTTOM_H * k)
  const bottomTop = colBottom - bottomH
  const trendW = Math.round((bottomW - GAP) * TREND_RATIO)
  const bottom =
    cards.length === 2
      ? [
          { card: cards[0], rect: { left: bottomX, top: bottomTop, width: trendW, height: bottomH } },
          {
            card: cards[1],
            rect: { left: bottomX + trendW + GAP, top: bottomTop, width: bottomW - trendW - GAP, height: bottomH },
          },
        ]
      : cards.map((card) => ({ card, rect: { left: bottomX, top: bottomTop, width: bottomW, height: bottomH } }))

  return {
    width,
    height,
    fixed,
    right,
    bottom,
    omitted: queue.slice(2),
    bottomTop: cards.length ? bottomTop : null,
    mapSafe: { left: bottomX, right: rightX - 16, top: HEADER_H + 96 },
  }
}

/**
 * 视口 → 画布：按宽高中较小的比例等比缩放 (文字不变形)，画布逻辑尺寸 = 视口 / 比例，
 * 因此画布总是正好铺满视口，卡片贴边
 */
export function fitScreen(viewW: number, viewH: number) {
  const scale = Math.min(viewW / DESIGN_W, viewH / DESIGN_H)
  return { scale, width: viewW / scale, height: viewH / scale }
}
