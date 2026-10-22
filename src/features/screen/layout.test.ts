import { describe, expect, it } from 'vitest'
import { computeLayout, DESIGN_H, DESIGN_W, fitScreen, type Rect, type ScreenFeatures } from './layout'

const ALL: ScreenFeatures = { sensors: true, relays: true, cameras: true }
const plan = (f: ScreenFeatures, w = DESIGN_W, h = DESIGN_H) => computeLayout(w, h, f)
const cards = (p: ReturnType<typeof plan>) => ({
  right: p.right.map((r) => r.card),
  bottom: p.bottom.map((b) => b.card),
  omitted: p.omitted,
})
const bottomOf = (r: Rect) => r.top + r.height
const rightOf = (r: Rect) => r.left + r.width

describe('卡片编排', () => {
  it('传感器 + 继电器 + 摄像头：右侧 实时数据、实时监控，操作记录省略；底部 曲线 + 继电器', () => {
    expect(cards(plan(ALL))).toEqual({
      right: ['realtime', 'camera'],
      bottom: ['trend', 'relay'],
      omitted: ['operations'],
    })
  })

  it('无摄像头时操作记录补上第二个槽位', () => {
    expect(cards(plan({ ...ALL, cameras: false })).right).toEqual(['realtime', 'operations'])
  })

  it('只有继电器：右侧 实时监控 + 操作记录，底部继电器占满', () => {
    const p = plan({ sensors: false, relays: true, cameras: true })
    expect(cards(p)).toEqual({ right: ['camera', 'operations'], bottom: ['relay'], omitted: [] })
    expect(p.bottom[0].rect.width).toBeGreaterThan(900)
  })

  it('只有传感器且无摄像头：右侧只有实时数据，第二个槽位空着', () => {
    expect(cards(plan({ sensors: true, relays: false, cameras: false }))).toEqual({
      right: ['realtime'],
      bottom: ['trend'],
      omitted: [],
    })
  })

  it('都没有：右侧只剩固定的设备信息，底部隐藏', () => {
    const p = plan({ sensors: false, relays: false, cameras: false })
    expect(p.right).toEqual([])
    expect(p.bottom).toEqual([])
    expect(p.bottomTop).toBeNull()
  })

  it('1920 × 1080 与设计稿一致', () => {
    const p = plan(ALL)
    expect(p.fixed.weather).toEqual({ left: 20, top: 96, width: 440, height: 300 })
    expect(p.fixed.alarms).toEqual({ left: 20, top: 720, width: 440, height: 340 })
    expect(p.right.map((r) => r.rect.top)).toEqual([408, 740])
    expect(p.bottom.map((b) => b.rect)).toEqual([
      { left: 476, top: 780, width: 588, height: 280 },
      { left: 1076, top: 780, width: 368, height: 280 },
    ])
  })
})

describe('贴边：不同屏幕比例下卡片都贴住左、右、下边，且不重叠', () => {
  for (const [w, h] of [
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [2560, 1080],
    [1280, 1024],
    [3840, 2160],
  ]) {
    it(`${w} × ${h}`, () => {
      const f = fitScreen(w, h)
      expect(f.width * f.scale).toBeCloseTo(w)
      expect(f.height * f.scale).toBeCloseTo(h)
      const p = computeLayout(f.width, f.height, ALL)
      const edge = 20
      // 左栏贴左、贴下；右栏贴右、贴下；底部贴下
      expect(p.fixed.weather.left).toBe(edge)
      expect(bottomOf(p.fixed.alarms)).toBeCloseTo(f.height - edge)
      expect(rightOf(p.fixed.deviceInfo)).toBeCloseTo(f.width - edge)
      expect(bottomOf(p.right[1].rect)).toBeCloseTo(f.height - edge)
      for (const b of p.bottom) expect(bottomOf(b.rect)).toBeCloseTo(f.height - edge)
      // 栏内不重叠
      expect(p.fixed.deviceTypes.top).toBeGreaterThan(bottomOf(p.fixed.weather))
      expect(p.fixed.alarms.top).toBeGreaterThan(bottomOf(p.fixed.deviceTypes))
      expect(p.right[0].rect.top).toBeGreaterThan(bottomOf(p.fixed.deviceInfo))
      expect(p.right[1].rect.top).toBeGreaterThan(bottomOf(p.right[0].rect))
      expect(p.bottom[1].rect.left).toBeGreaterThan(rightOf(p.bottom[0].rect))
      expect(rightOf(p.bottom[1].rect)).toBeLessThan(p.right[0].rect.left)
    })
  }

  it('更高的屏幕 (16:10) 卡片按设计稿比例等比变高', () => {
    const f = fitScreen(1440, 900)
    const p = computeLayout(f.width, f.height, ALL)
    const k = p.fixed.weather.height / 300
    expect(k).toBeGreaterThan(1)
    expect(p.fixed.deviceTypes.height / 300).toBeCloseTo(k, 1)
    expect(p.bottom[0].rect.height / 280).toBeCloseTo(k, 1)
  })
})
