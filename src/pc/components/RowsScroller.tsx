import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * 限高滚动容器：最大高度 = 子网格 / 列表的 rows 行 (按第一项的高度与行间距计算)，超出部分在内部滚动
 * - children 应为单个网格或纵向 flex 容器 (卡片列表)
 * - height 指定时使用给定高度 (例如继电器列表与传感器卡片区等高)；onHeight 回报自身计算出的高度
 * - 窗口宽度、卡片内容变化时重新计算 (ResizeObserver)
 */
export function RowsScroller({
  rows = 3,
  height,
  onHeight,
  children,
}: {
  rows?: number
  height?: number
  onHeight?: (h: number | undefined) => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [own, setOwn] = useState<number>()

  useLayoutEffect(() => {
    const list = ref.current?.firstElementChild as HTMLElement | null
    if (!list) return
    const measure = () => {
      const first = list.firstElementChild as HTMLElement | null
      if (!first) return setOwn(undefined)
      const gap = Number.parseFloat(getComputedStyle(list).rowGap) || 0
      setOwn(Math.ceil(first.offsetHeight * rows + gap * (rows - 1)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(list)
    return () => ro.disconnect()
  }, [rows])

  useEffect(() => onHeight?.(own), [own, onHeight])
  const max = height ?? own

  return (
    // 负外边距 + 内边距：滚动条落在卡片内边距里，不挤占内容宽度；卡片描边不被裁切
    <div
      ref={ref}
      className="-m-1 -mr-3 overflow-y-auto p-1 pr-3"
      style={{ maxHeight: max == null ? undefined : max + 8 }}
    >
      {children}
    </div>
  )
}
