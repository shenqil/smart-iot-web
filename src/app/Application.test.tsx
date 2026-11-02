import { act, cleanup, render, screen } from '@testing-library/react'
import { type ReactNode, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Application } from './Application'

const mock = vi.hoisted(() => ({
  listeners: new Set<() => void>(),
  state: { initialized: false, location: { pathname: '/h5/3/devices' } },
}))
vi.mock('@/router', () => ({
  router: {
    get state() {
      return mock.state
    },
    subscribe: (listener: () => void) => {
      mock.listeners.add(listener)
      return () => mock.listeners.delete(listener)
    },
  },
}))
vi.mock('./AppProviders', () => ({
  AppProviders: ({ children, pathname }: { children: ReactNode; pathname: string }) => (
    <div data-testid="provider" data-path={pathname}>
      {children}
    </div>
  ),
}))
vi.mock('./SessionWatcher', () => ({ SessionWatcher: () => null }))
// 模拟 RouterProvider 在首次挂载时读取快照；不能提前挂载并永久持有未初始化状态。
vi.mock('react-router', () => ({
  RouterProvider: () => {
    const [initialized] = useState(mock.state.initialized)
    return <p>{initialized ? '页面已就绪' : '错误的初始快照'}</p>
  },
}))
afterEach(() => {
  cleanup()
  mock.state = { initialized: false, location: { pathname: '/h5/3/devices' } }
  mock.listeners.clear()
})
describe('应用初始化', () => {
  it('路由完成后才挂载 RouterProvider，并保持移动 Provider', () => {
    render(<Application />)
    expect(screen.queryByText('错误的初始快照')).not.toBeInTheDocument()
    act(() => {
      mock.state = { ...mock.state, initialized: true }
      mock.listeners.forEach((fn) => {
        fn()
      })
    })
    expect(screen.getByText('页面已就绪')).toBeInTheDocument()
    expect(screen.getByTestId('provider')).toHaveAttribute('data-path', '/h5/3/devices')
  })
  it('加载已完成时可直接进入，后续导航同步端选择', () => {
    mock.state = { initialized: true, location: { pathname: '/h5/3/home' } }
    render(<Application />)
    expect(screen.getByText('页面已就绪')).toBeInTheDocument()
    act(() => {
      mock.state = { initialized: true, location: { pathname: '/app/3/monitor' } }
      mock.listeners.forEach((fn) => {
        fn()
      })
    })
    expect(screen.getByTestId('provider')).toHaveAttribute('data-path', '/app/3/monitor')
  })
})
