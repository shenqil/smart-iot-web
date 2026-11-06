import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MobileLoginPage from './LoginPage'

const mockLogin = vi.fn().mockResolvedValue({})

vi.mock('@shared/api/auth', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  meQuery: { queryKey: ['me'], queryFn: async () => ({ id: 1, role: 'admin' }) },
  myCompaniesQuery: { queryKey: ['companies'], queryFn: async () => [] },
}))

vi.mock('@shared/queryClient', () => ({
  queryClient: {
    ensureQueryData: vi.fn().mockImplementation((query) => query.queryFn()),
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('H5 登录页面', () => {
  it('正确渲染美化后的输入框与密码填充属性', () => {
    render(
      <MemoryRouter>
        <MobileLoginPage />
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

  it('支持点击图标切换密码明文和密文显示', () => {
    render(
      <MemoryRouter>
        <MobileLoginPage />
      </MemoryRouter>,
    )

    const passwordInput = screen.getByPlaceholderText('请输入密码') as HTMLInputElement
    expect(passwordInput.type).toBe('password')

    const toggleBtn = screen.getByLabelText('显示密码')
    fireEvent.click(toggleBtn)

    expect(passwordInput.type).toBe('text')

    const hideBtn = screen.getByLabelText('隐藏密码')
    fireEvent.click(hideBtn)

    expect(passwordInput.type).toBe('password')
  })

  it('输入用户名后可点击清除按钮清空内容', () => {
    render(
      <MemoryRouter>
        <MobileLoginPage />
      </MemoryRouter>,
    )

    const usernameInput = screen.getByPlaceholderText('请输入用户名') as HTMLInputElement
    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    expect(usernameInput.value).toBe('testuser')

    const clearBtn = screen.getByLabelText('清除内容')
    fireEvent.click(clearBtn)

    expect(usernameInput.value).toBe('')
  })

  it('模拟浏览器直接填充 DOM 输入框时能够成功登录', async () => {
    render(
      <MemoryRouter>
        <MobileLoginPage />
      </MemoryRouter>,
    )

    const usernameInput = screen.getByPlaceholderText('请输入用户名') as HTMLInputElement
    const passwordInput = screen.getByPlaceholderText('请输入密码') as HTMLInputElement
    const submitBtn = screen.getByRole('button', { name: '登录' })

    // 模拟浏览器/密码管理器直接写入 DOM 节点的 value
    usernameInput.value = 'mobile_user'
    passwordInput.value = 'mypassword123'

    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('mobile_user', 'mypassword123')
    })
  })
})
