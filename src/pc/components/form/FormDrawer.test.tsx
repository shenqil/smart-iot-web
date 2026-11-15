import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Form, Input } from 'antd'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/errors'
import { FormDrawer } from './FormDrawer'

const mockHandleGlobalError = vi.fn()

vi.mock('@/app/queryClient', () => ({
  handleGlobalError: (...args: unknown[]) => mockHandleGlobalError(...args),
}))

vi.mock('@/app/notify', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    modal: vi.fn(),
  },
}))

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
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

describe('FormDrawer 409 冲突错误处理', () => {
  it('仅对 409 DUPLICATE 标记 conflictField 字段错误', async () => {
    const err = new ApiError(409, 'DUPLICATE', '用户名已存在')
    render(
      <FormDrawer<{ username: string }>
        open
        title="编辑用户"
        initialValues={{ username: 'admin' }}
        conflictField="username"
        onClose={vi.fn()}
        onSubmit={() => Promise.reject(err)}
      >
        <Form.Item name="username" label="用户名">
          <Input />
        </Form.Item>
      </FormDrawer>,
    )

    fireEvent.click(screen.getByRole('button', { name: '保 存' }))

    await waitFor(() => expect(mockHandleGlobalError).toHaveBeenCalledWith(err))
    expect(await screen.findByText('用户名已存在')).toBeInTheDocument()
  })

  it('409 LAST_ADMIN 不应把错误误标到 username 字段', async () => {
    const err = new ApiError(409, 'LAST_ADMIN', '系统至少保留一位启用中的平台管理员')
    render(
      <FormDrawer<{ username: string }>
        open
        title="编辑用户"
        initialValues={{ username: 'admin' }}
        conflictField="username"
        onClose={vi.fn()}
        onSubmit={() => Promise.reject(err)}
      >
        <Form.Item name="username" label="用户名">
          <Input />
        </Form.Item>
      </FormDrawer>,
    )

    fireEvent.click(screen.getByRole('button', { name: '保 存' }))

    await waitFor(() => expect(mockHandleGlobalError).toHaveBeenCalledWith(err))
    expect(screen.queryByText('系统至少保留一位启用中的平台管理员')).not.toBeInTheDocument()
  })
})
