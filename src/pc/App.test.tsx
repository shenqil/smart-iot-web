import { act, cleanup, render, screen } from '@testing-library/react'
import { type ReactNode, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

const mock = vi.hoisted(() => ({
  listeners: new Set<() => void>(),
  state: { initialized: false, location: { pathname: '/login' } },
}))
vi.mock('./router', () => ({
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
vi.mock('./Providers', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="provider">{children}</div>,
}))
vi.mock('@/shared/SessionWatcher', () => ({ SessionWatcher: () => null }))
vi.mock('react-router', () => ({
  RouterProvider: () => {
    const [initialized] = useState(mock.state.initialized)
    return <p>{initialized ? '页面已就绪' : '错误的初始快照'}</p>
  },
}))
afterEach(() => {
  cleanup()
  mock.state = { initialized: false, location: { pathname: '/login' } }
  mock.listeners.clear()
})
describe('PC 应用初始化', () => {
  it('路由完成后才挂载 RouterProvider', () => {
    render(<App />)
    expect(screen.queryByText('错误的初始快照')).not.toBeInTheDocument()
    act(() => {
      mock.state = { ...mock.state, initialized: true }
      mock.listeners.forEach((fn) => {
        fn()
      })
    })
    expect(screen.getByText('页面已就绪')).toBeInTheDocument()
  })
})
