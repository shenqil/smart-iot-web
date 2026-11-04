import { beforeEach, describe, expect, it } from 'vitest'
import { useSession } from './session'
import { DEFAULT_FRONTEND_CONFIG, parseFrontendConfig, useSysConfig } from './sysConfig'

describe('parseFrontendConfig', () => {
  it('正常解析并去掉首尾空白', () => {
    expect(parseFrontendConfig('{"tianditu":{"browserKey":" abc "},"other":1}')).toEqual({
      tianditu: { browserKey: 'abc' },
    })
  })
  it('非法 JSON、空值、结构不对时使用默认值', () => {
    for (const raw of [
      null,
      undefined,
      '',
      'not json {',
      '[]',
      '1',
      '{"tianditu":"x"}',
      '{"tianditu":{"browserKey":1}}',
    ]) {
      expect(parseFrontendConfig(raw)).toEqual(DEFAULT_FRONTEND_CONFIG)
    }
  })
})

describe('useSysConfig', () => {
  beforeEach(() => {
    useSession.getState().clear()
    useSysConfig.getState().clear()
  })

  it('令牌变化时清空', () => {
    useSession.getState().setSession('t1', '2999-01-01T00:00:00Z')
    useSysConfig.getState().setFrontend('t1', '{"tianditu":{"browserKey":"k"}}')
    expect(useSysConfig.getState()).toMatchObject({ status: 'ready', token: 't1' })
    expect(useSysConfig.getState().frontend.tianditu.browserKey).toBe('k')

    useSession.getState().clear()
    expect(useSysConfig.getState()).toMatchObject({ status: 'idle', token: null, frontend: DEFAULT_FRONTEND_CONFIG })
  })
})
