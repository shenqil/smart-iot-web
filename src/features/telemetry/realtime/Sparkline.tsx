/** 迷你折线 (无坐标轴)，宽度随容器；少于 2 个点时显示一条基线 */
export function Sparkline({ values, tone = 'primary' }: { values: number[]; tone?: 'primary' | 'warning' | 'muted' }) {
  const W = 120
  const H = 32
  const color = {
    primary: 'var(--ant-color-primary)',
    warning: 'var(--ant-color-warning)',
    muted: 'var(--ant-color-text-quaternary)',
  }[tone]
  if (values.length < 2)
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-8 w-full" aria-hidden>
        <line x1="0" x2={W} y1={H - 1} y2={H - 1} stroke="var(--ant-color-border)" strokeDasharray="2 3" />
      </svg>
    )
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - 3 - ((v - min) / span) * (H - 6)] as const)
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-8 w-full overflow-visible" aria-hidden>
      <polygon points={`0,${H} ${line} ${W},${H}`} fill={color} opacity={0.08} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lx} cy={ly} r={2.5} fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
