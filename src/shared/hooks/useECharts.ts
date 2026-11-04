import { LineChart, type LineSeriesOption } from 'echarts/charts'
import {
  DataZoomComponent,
  type DataZoomComponentOption,
  GridComponent,
  type GridComponentOption,
  LegendComponent,
  type LegendComponentOption,
  TooltipComponent,
  type TooltipComponentOption,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useRef } from 'react'

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, CanvasRenderer])

export type ECOption = echarts.ComposeOption<
  LineSeriesOption | GridComponentOption | TooltipComponentOption | LegendComponentOption | DataZoomComponentOption
>
export type ECharts = echarts.ECharts
export { echarts }

/**
 * ECharts 初始化 / 自适应尺寸 / 销毁 (FRONTEND_DESIGN §7 useECharts)
 * option 变化时整体替换 (notMerge)；需要局部更新 (如缩放后替换数据) 时用返回的 chart 调 setOption
 */
export function useECharts(option: ECOption | null, onInit?: (chart: ECharts) => (() => void) | undefined) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ECharts | null>(null)
  const onInitRef = useRef(onInit)
  onInitRef.current = onInit

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const chart = echarts.init(el, null, { renderer: 'canvas' })
    chartRef.current = chart
    const cleanup = onInitRef.current?.(chart)
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(el)
    return () => {
      cleanup?.()
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    if (option) chartRef.current?.setOption(option, { notMerge: true })
  }, [option])

  return { ref, chart: chartRef }
}

/** 分类色 (固定顺序，颜色跟随通道而不是排名；已按色觉差异校验) */
export const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']

/** 坐标轴 / 网格 / 文字：取 antd 亮色主题的中性色 */
export const AXIS_STYLE = {
  label: '#64748b',
  line: '#e5e7eb',
  text: '#1f2937',
}
