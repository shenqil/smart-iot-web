import type { ReactNode } from 'react'
import type { Rect } from './layout'

/** 大屏面板：标题栏 + 内容区 (内容区纵向 flex，列表用 .screen-scroll 隐藏滚动条滚动) */
export function Panel({
  title,
  extra,
  rect,
  className = '',
  children,
}: {
  title: ReactNode
  extra?: ReactNode
  rect: Rect
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`screen-panel ${className}`} style={rect}>
      <header className="screen-panel__head">
        <span className="screen-panel__dot" />
        <h2 className="screen-panel__title">{title}</h2>
        {extra && <div className="ml-auto flex min-w-0 items-center gap-2">{extra}</div>}
      </header>
      <div className="screen-panel__body">{children}</div>
    </section>
  )
}

/** 区块请求失败且没有旧数据时的提示 (不整页报错) */
export function PanelError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="screen-empty">
      <span>更新失败，稍后自动重试</span>
      {onRetry && (
        <button type="button" className="screen-btn is-quiet" onClick={onRetry}>
          立即重试
        </button>
      )}
    </div>
  )
}

export function PanelEmpty({ children }: { children: ReactNode }) {
  return <div className="screen-empty">{children}</div>
}
