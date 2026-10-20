import { describe, expect, it } from 'vitest'
import { DESIGN_H, FIXED, fitScreen, planScreen } from './layout'

const cards = (p: ReturnType<typeof planScreen>) => ({
  right: p.right.map((r) => r.card),
  bottom: p.bottom.map((b) => b.card),
  omitted: p.omitted,
})

describe('planScreen', () => {
  it('传感器 + 继电器 + 摄像头：右侧 实时数据、实时监控，操作记录省略；底部 曲线 + 继电器', () => {
    expect(cards(planScreen({ sensors: true, relays: true, cameras: true }))).toEqual({
      right: ['realtime', 'camera'],
      bottom: ['trend', 'relay'],
      omitted: ['operations'],
    })
  })

  it('无摄像头时操作记录补上第二个槽位', () => {
    expect(cards(planScreen({ sensors: true, relays: true, cameras: false })).right).toEqual(['realtime', 'operations'])
  })

  it('只有继电器：右侧 实时监控 + 操作记录，底部继电器占满', () => {
    const p = planScreen({ sensors: false, relays: true, cameras: true })
    expect(cards(p)).toEqual({ right: ['camera', 'operations'], bottom: ['relay'], omitted: [] })
    expect(p.bottom[0].rect.width).toBeGreaterThan(900)
  })

  it('只有传感器且无摄像头：右侧只有实时数据，第二个槽位空着', () => {
    const p = planScreen({ sensors: true, relays: false, cameras: false })
    expect(cards(p)).toEqual({ right: ['realtime'], bottom: ['trend'], omitted: [] })
  })

  it('都没有：右侧只剩固定的设备信息，底部隐藏', () => {
    const p = planScreen({ sensors: false, relays: false, cameras: false })
    expect(p.right).toEqual([])
    expect(p.bottom).toEqual([])
    expect(p.bottomTop).toBeNull()
  })

  it('卡片不重叠、不超出画布', () => {
    const p = planScreen({ sensors: true, relays: true, cameras: true })
    const [a, b] = p.right
    expect(a.rect.top).toBeGreaterThanOrEqual(FIXED.deviceInfo.top + FIXED.deviceInfo.height)
    expect(b.rect.top).toBeGreaterThanOrEqual(a.rect.top + a.rect.height)
    expect(b.rect.top + b.rect.height).toBeLessThanOrEqual(DESIGN_H)
    const [t, r] = p.bottom
    expect(r.rect.left).toBeGreaterThanOrEqual(t.rect.left + t.rect.width)
    expect(r.rect.left + r.rect.width).toBeLessThanOrEqual(a.rect.left)
  })
})

describe('fitScreen', () => {
  it('16:9 正好铺满', () => {
    expect(fitScreen(1920, 1080)).toEqual({ scale: 1, offsetX: 0, offsetY: 0 })
  })
  it('更宽的屏幕按高度缩放并水平居中', () => {
    const f = fitScreen(2560, 1080)
    expect(f.scale).toBe(1)
    expect(f.offsetX).toBe(320)
  })
  it('更高的屏幕按宽度缩放、顶端对齐', () => {
    const f = fitScreen(1280, 1024)
    expect(f.scale).toBeCloseTo(1280 / 1920)
    expect(f.offsetY).toBe(0)
  })
})
