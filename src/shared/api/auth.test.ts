import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/stores/session'

const postMock = vi.fn()
const navigateMock = vi.fn()

vi.mock('@/api/client', () => ({
  api: { POST: (...args: unknown[]) => postMock(...args), GET: vi.fn() },
  unwrap: vi.fn(),
}))

vi.mock('@/app/navigation', () => ({
  loginPath: () => '/login',
  navigateTo: (...args: unknown[]) => navigateMock(...args),
}))

import { logout } from './auth'

describe('logout', () => {
  beforeEach(() => {
    postMock.mockReset()
    navigateMock.mockReset()
    useSession.getState().clear()
  })

  it('有 token 时调用 /api/v1/auth/logout 吊销令牌并清理本地会话', async () => {
    postMock.mockResolvedValueOnce({ data: undefined })
    useSession.getState().setSession('jwt-token', '2099-01-01T00:00:00Z')

    await logout()

    expect(postMock).toHaveBeenCalledWith(
      '/api/v1/auth/logout',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(useSession.getState().token).toBeNull()
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true })
  })

  it('吊销请求失败时仍清理本地会话并跳转登录页', async () => {
    postMock.mockRejectedValueOnce(new Error('network'))
    useSession.getState().setSession('jwt-token', '2099-01-01T00:00:00Z')

    await logout()

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(useSession.getState().token).toBeNull()
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true })
  })

  it('无 token 时跳过后端吊销请求', async () => {
    await logout()

    expect(postMock).not.toHaveBeenCalled()
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true })
  })

  it('并发调用时复用同一退出流程，仅发一次吊销请求', async () => {
    postMock.mockResolvedValueOnce({ data: undefined })
    useSession.getState().setSession('jwt-token', '2099-01-01T00:00:00Z')

    const p1 = logout()
    const p2 = logout()
    expect(p1).toBe(p2)
    await Promise.all([p1, p2])

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalledTimes(1)
  })
})
