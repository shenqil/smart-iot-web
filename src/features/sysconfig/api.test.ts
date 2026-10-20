import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/errors'
import { useSession } from '@/stores/session'
import { useSysConfig } from '@/stores/sysConfig'
import { loadFrontendConfig } from './api'

const GET = vi.hoisted(() => vi.fn())
vi.mock('@/api/client', () => ({
  api: { GET },
  unwrap: async (p: Promise<{ data?: unknown }>) => (await p).data,
}))

const ok = (value: string) => Promise.resolve({ data: { key: 'frontend', value } })

describe('loadFrontendConfig', () => {
  beforeEach(() => {
    GET.mockReset()
    useSession.getState().clear()
    useSysConfig.getState().clear()
  })

  it('未登录不请求', async () => {
    await loadFrontendConfig()
    expect(GET).not.toHaveBeenCalled()
  })

  it('加载到 store；同一令牌只请求一次 (并发合并)，force 时重新加载', async () => {
    useSession.getState().setSession('t1', '2999-01-01T00:00:00Z')
    GET.mockImplementation(() => ok('{"tianditu":{"browserKey":"k1"}}'))
    await Promise.all([loadFrontendConfig(), loadFrontendConfig()])
    await loadFrontendConfig()
    expect(GET).toHaveBeenCalledTimes(1)
    expect(GET).toHaveBeenCalledWith('/api/v1/common/sys-configs/{key}', { params: { path: { key: 'frontend' } } })
    expect(useSysConfig.getState()).toMatchObject({ status: 'ready', token: 't1' })
    expect(useSysConfig.getState().frontend.tianditu.browserKey).toBe('k1')

    GET.mockImplementation(() => ok('{"tianditu":{"browserKey":"k2"}}'))
    await loadFrontendConfig({ force: true })
    expect(GET).toHaveBeenCalledTimes(2)
    expect(useSysConfig.getState().frontend.tianditu.browserKey).toBe('k2')
  })

  it('换令牌后重新加载', async () => {
    useSession.getState().setSession('t1', '2999-01-01T00:00:00Z')
    GET.mockImplementation(() => ok('{"tianditu":{"browserKey":"k1"}}'))
    await loadFrontendConfig()
    useSession.getState().setSession('t2', '2999-01-01T00:00:00Z')
    await loadFrontendConfig()
    expect(GET).toHaveBeenCalledTimes(2)
    expect(useSysConfig.getState().token).toBe('t2')
  })

  it('404 按默认值处理；其他错误记为 error 且不抛出，下次重试', async () => {
    useSession.getState().setSession('t1', '2999-01-01T00:00:00Z')
    GET.mockImplementation(() => Promise.reject(new ApiError(404, 'NOT_FOUND', '系统配置不存在', [], null)))
    await loadFrontendConfig()
    expect(useSysConfig.getState()).toMatchObject({ status: 'ready', frontend: { tianditu: { browserKey: '' } } })

    useSysConfig.getState().clear()
    GET.mockImplementation(() => Promise.reject(new ApiError(0, 'NETWORK_ERROR', '网络异常', [], null)))
    await expect(loadFrontendConfig()).resolves.toBeUndefined()
    expect(useSysConfig.getState().status).toBe('error')

    GET.mockImplementation(() => ok('{"tianditu":{"browserKey":"k"}}'))
    await loadFrontendConfig()
    expect(useSysConfig.getState()).toMatchObject({ status: 'ready', frontend: { tianditu: { browserKey: 'k' } } })
  })

  it('请求返回前令牌已变化：丢弃结果', async () => {
    useSession.getState().setSession('t1', '2999-01-01T00:00:00Z')
    let resolve!: (v: unknown) => void
    GET.mockImplementation(() => new Promise((r) => (resolve = r)))
    const p = loadFrontendConfig()
    useSession.getState().clear()
    resolve({ data: { key: 'frontend', value: '{"tianditu":{"browserKey":"stale"}}' } })
    await p
    expect(useSysConfig.getState()).toMatchObject({ status: 'idle', token: null })
  })
})
