import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Page } from './Page'

vi.mock('@/hooks/session', () => ({ useCompanyId: () => 3, useMe: () => ({ id: 1 }) }))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
describe('页面外壳', () => {
  it('页签与导航共用固定头，普通标题不渲染禁用按钮', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/h5/3/fixture-head']}>
        <Page
          title="设备 A"
          tabs={[
            { key: 'live', title: '实时' },
            { key: 'history', title: '历史' },
          ]}
          tab="live"
        >
          <p>读数</p>
        </Page>
      </MemoryRouter>,
    )
    const chrome = container.querySelector('.h5-chrome')
    expect(chrome?.querySelector('.adm-tabs')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '设备 A' })).not.toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('读数')
  })
  it('等待异步内容增高后恢复列表位置', () => {
    let resize: (() => void) | undefined
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          resize = cb
        }
        observe() {}
        disconnect() {}
      },
    )
    const fixture = () =>
      render(
        <MemoryRouter initialEntries={['/h5/3/fixture-scroll']}>
          <Page title="列表">
            <p>异步内容</p>
          </Page>
        </MemoryRouter>,
      )
    const first = fixture()
    const old = screen.getByRole('main')
    old.scrollTop = 320
    fireEvent.scroll(old)
    first.unmount()
    fixture()
    const current = screen.getByRole('main')
    Object.defineProperties(current, { scrollHeight: { value: 1000 }, clientHeight: { value: 400 } })
    resize?.()
    expect(current.scrollTop).toBe(320)
    expect(current.style.getPropertyValue('--collapse')).toBe('1')
  })
})
