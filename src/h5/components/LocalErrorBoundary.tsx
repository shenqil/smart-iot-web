import { Button, ErrorBlock } from 'antd-mobile'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { errorText } from '@/api/errors'

export interface LocalErrorBoundaryProps {
  children: ReactNode
  fallbackTitle?: string
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  onCatch?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * 局部微隔离错误边界：
 * 隔离高风险第三方库（ezuikit-js 视频流、ECharts 遥测图表、Leaflet 地图）的渲染异常，
 * 避免局部异常向外冒泡导致整个 H5 页面崩溃白屏。
 */
export class LocalErrorBoundary extends Component<LocalErrorBoundaryProps, State> {
  override state: State = {
    hasError: false,
    error: null,
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onCatch?.(error, errorInfo)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  override render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const { fallback, fallbackTitle = '该组件加载异常' } = this.props
    const error = this.state.error ?? new Error('未知异常')

    if (typeof fallback === 'function') {
      return fallback(error, this.reset)
    }

    if (fallback) {
      return fallback
    }

    return (
      <div className="h5-state h5-local-error" role="alert">
        <ErrorBlock
          status="default"
          title={fallbackTitle}
          description={errorText(error) || '渲染遇到问题，您可以尝试重新加载'}
        />
        <div style={{ marginTop: 12 }}>
          <Button size="small" fill="outline" color="primary" onClick={this.reset}>
            重试
          </Button>
        </div>
      </div>
    )
  }
}
