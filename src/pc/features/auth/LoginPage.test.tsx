import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'

const mockLogin = vi.fn().mockResolvedValue({})

vi.mock('./api', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  meQuery: { queryKey: ['me'], queryFn: async () => ({ id: 1, role: 'admin' }) },
  myCompaniesQuery: { queryKey: ['companies'], queryFn: async () => [] },
}))

vi.mock('@/app/queryClient', () => ({
  queryClient: {
    ensureQueryData: vi.fn().mockImplementation((query) => query.queryFn()),
  },
}))

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PC 登录页面', () => {
  it('正确渲染表单及利于浏览器密码填充的属性', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    const usernameInput = screen.getByPlaceholderText('请输入用户名') as HTMLInputElement
    const passwordInput = screen.getByPlaceholderText('请输入密码') as HTMLInputElement

    expect(usernameInput).toHaveAttribute('id', 'username')
    expect(usernameInput).toHaveAttribute('name', 'username')
    expect(usernameInput).toHaveAttribute('autocomplete', 'username')

    expect(passwordInput).toHaveAttribute('id', 'password')
    expect(passwordInput).toHaveAttribute('name', 'password')
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('模拟浏览器直接填充 DOM 输入框时能够成功登录', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    const usernameInput = screen.getByPlaceholderText('请输入用户名') as HTMLInputElement
    const passwordInput = screen.getByPlaceholderText('请输入密码') as HTMLInputElement
    const submitBtn = screen.getByRole('button', { name: '登 录' })

    // 模拟浏览器/密码管理器直接写入 DOM 节点的 value
    usernameInput.value = 'admin'
    passwordInput.value = 'secret123'

    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'secret123')
    })
  })
})
