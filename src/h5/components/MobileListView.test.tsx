import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileListView } from './MobileListView'

afterEach(() => {
  cleanup()
})

describe('MobileListView 通用列表视图容器', () => {
  it('在初始加载中展示 Loading 指示器', () => {
    render(
      <MobileListView
        items={[]}
        renderItem={(item) => <div>{item}</div>}
        keyExtractor={(item) => item}
        isPending={true}
      />,
    )
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', '加载中')
  })

  it('在空数据时展示空状态提示', () => {
    render(
      <MobileListView
        items={[]}
        renderItem={(item) => <div>{item}</div>}
        keyExtractor={(item) => item}
        emptyTitle="暂无任何设备"
      />,
    )
    expect(screen.getByText('暂无任何设备')).toBeInTheDocument()
  })

  it('展示列表条目并在错误时支持重试', () => {
    const onRetry = vi.fn()
    render(
      <MobileListView
        items={['设备 1', '设备 2']}
        renderItem={(item) => <div>{item}</div>}
        keyExtractor={(item) => item}
        isError={true}
        error={new Error('网络连接超时')}
        onRetry={onRetry}
      />,
    )
    expect(screen.getByText('设备 1')).toBeInTheDocument()
    expect(screen.getByText('设备 2')).toBeInTheDocument()
    expect(screen.getByText(/网络连接超时/)).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: '重新加载' })
    fireEvent.click(retryBtn)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
