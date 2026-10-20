/**
 * 大屏卡片编排 (FRONTEND_DESIGN §5.7)
 * 设计稿 1920 × 1080；左栏 3 张、右上「设备信息」固定，其余按当前设备的通道配置与园区有无摄像头出现：
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

const COL_W = 440
const GAP = 12
const LEFT_X = 20
const RIGHT_X = DESIGN_W - 20 - COL_W
const COL_TOP = HEADER_H + 12
const COL_BOTTOM = DESIGN_H - 20
/** 左栏三张：300 / 300 / 340 */
const LEFT_H = [300, 300, 340] as const
const SLOT_H = 320
const BOTTOM_H = 280
const BOTTOM_X = LEFT_X + COL_W + 16
const BOTTOM_W = RIGHT_X - 16 - BOTTOM_X
/** 底部两张并排时：曲线约 3/5，继电器约 2/5 */
const TREND_W = 588

export const FIXED = {
  weather: { left: LEFT_X, top: COL_TOP, width: COL_W, height: LEFT_H[0] },
  deviceTypes: { left: LEFT_X, top: COL_TOP + LEFT_H[0] + GAP, width: COL_W, height: LEFT_H[1] },
  alarms: {
    left: LEFT_X,
    top: COL_TOP + LEFT_H[0] + LEFT_H[1] + GAP * 2,
    width: COL_W,
    height: COL_BOTTOM - (COL_TOP + LEFT_H[0] + LEFT_H[1] + GAP * 2),
  },
  deviceInfo: { left: RIGHT_X, top: COL_TOP, width: COL_W, height: LEFT_H[0] },
} satisfies Record<string, Rect>

/** 地图上可见区域 (两侧面板之间) 的左右边界，用于让视野、图例避开面板 */
export const MAP_SAFE = { left: LEFT_X + COL_W + 16, right: RIGHT_X - 16, top: HEADER_H + 96 } as const

export type RightCard = 'realtime' | 'camera' | 'operations'
export type BottomCard = 'trend' | 'relay'

export interface ScreenPlan {
  right: { card: RightCard; rect: Rect }[]
  bottom: { card: BottomCard; rect: Rect }[]
  /** 因槽位已满而省略的卡片 (操作记录省略时继电器卡片给入口) */
  omitted: RightCard[]
  /** 底部区域的顶边 (隐藏时为 null)；图例、地图视野据此避让 */
  bottomTop: number | null
}

export function planScreen(f: { sensors: boolean; relays: boolean; cameras: boolean }): ScreenPlan {
  const queue: RightCard[] = []
  if (f.sensors) queue.push('realtime')
  if (f.cameras) queue.push('camera')
  if (f.relays) queue.push('operations')
  const right = queue.slice(0, 2).map((card, i) => ({
    card,
    rect: {
      left: RIGHT_X,
      top: FIXED.deviceInfo.top + FIXED.deviceInfo.height + GAP + i * (SLOT_H + GAP),
      width: COL_W,
      height: SLOT_H,
    },
  }))

  const cards: BottomCard[] = []
  if (f.sensors) cards.push('trend')
  if (f.relays) cards.push('relay')
  const top = COL_BOTTOM - BOTTOM_H
  const bottom =
    cards.length === 2
      ? [
          { card: cards[0], rect: { left: BOTTOM_X, top, width: TREND_W, height: BOTTOM_H } },
          {
            card: cards[1],
            rect: { left: BOTTOM_X + TREND_W + GAP, top, width: BOTTOM_W - TREND_W - GAP, height: BOTTOM_H },
          },
        ]
      : cards.map((card) => ({ card, rect: { left: BOTTOM_X, top, width: BOTTOM_W, height: BOTTOM_H } }))

  return { right, bottom, omitted: queue.slice(2), bottomTop: cards.length ? top : null }
}

/**
 * 设计稿 → 视口：按宽高中较小的比例等比缩放，水平居中、顶端对齐 (更高的屏幕多出的高度留给地图)
 */
export function fitScreen(viewW: number, viewH: number) {
  const scale = Math.min(viewW / DESIGN_W, viewH / DESIGN_H)
  return { scale, offsetX: (viewW - DESIGN_W * scale) / 2, offsetY: 0 }
}
