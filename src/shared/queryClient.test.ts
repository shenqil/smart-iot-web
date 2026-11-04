import { queryClient, resetCompanyCache } from './queryClient'

describe('resetCompanyCache', () => {
  it('只保留登录态、字典与目标企业在该端的数据', () => {
    const keys = [
      ['auth', 'me'],
      ['auth', 'companies'],
      ['dict', 'standard-sensors'],
      ['app', 1, 'sites', 'all'],
      ['app', 1, 'devices', 'realtime', 101],
      ['app', 2, 'sites', 'all'],
      ['tenant', 2, 'sites', 'list'],
      ['admin', 0, 'devices', 'list'],
      ['common', 'weather', 30.1, 120.1],
    ]
    for (const k of keys) queryClient.setQueryData(k, { ok: true })
    resetCompanyCache('app', 2)
    const left = queryClient
      .getQueryCache()
      .getAll()
      .map((q) => q.queryKey)
    expect(left).toEqual([
      ['auth', 'me'],
      ['auth', 'companies'],
      ['dict', 'standard-sensors'],
      ['app', 2, 'sites', 'all'],
    ])
    queryClient.clear()
  })
})
