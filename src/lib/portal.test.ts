import { describe, expect, it } from 'vitest'
import {
  availablePortals,
  isPathAllowed,
  landingPath,
  type Me,
  type MyCompany,
  parsePortalPath,
  pickCompany,
  switchPortalPath,
} from './portal'

const me = (systemRole: 'admin' | 'none' = 'none'): Me => ({
  id: 1,
  username: 'u',
  nickname: '',
  phone: null,
  systemRole,
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
})

const company = (companyId: number, opts: Partial<MyCompany> = {}): MyCompany => ({
  companyId,
  name: `C${companyId}`,
  logo: '',
  role: 'user',
  status: 'active',
  expiredAt: null,
  joinedAt: '2026-01-01T00:00:00Z',
  accessible: true,
  manageable: false,
  ...opts,
})

const A = company(1, { role: 'admin', manageable: true })
const U = company(2)
const X = company(3, { status: 'inactive', accessible: false })

describe('availablePortals', () => {
  it('系统 admin + 企业管理员 + 成员', () => {
    expect(availablePortals(me('admin'), [A, U])).toEqual(['admin', 'tenant', 'app'])
  })
  it('只有普通成员', () => {
    expect(availablePortals(me(), [U])).toEqual(['app'])
  })
  it('只有停用企业', () => {
    expect(availablePortals(me(), [X])).toEqual([])
  })
})

describe('pickCompany', () => {
  it('优先使用满足条件的 preferId', () => {
    expect(pickCompany('app', [A, U], 2)).toBe(2)
  })
  it('preferId 不满足时取第一个满足的', () => {
    expect(pickCompany('tenant', [A, U], 2)).toBe(1)
    expect(pickCompany('app', [X, U], 3)).toBe(2)
  })
})

describe('landingPath', () => {
  it('redirect 有权限时直接跳转', () => {
    expect(landingPath({ me: me(), companies: [U], redirect: '/app/2/alarms?x=1' })).toBe('/app/2/alarms?x=1')
  })
  it('redirect 无权限 / 站外时忽略', () => {
    expect(landingPath({ me: me(), companies: [U], redirect: '/admin' })).toBe('/app/2/monitor')
    expect(landingPath({ me: me(), companies: [U], redirect: '//evil.com' })).toBe('/app/2/monitor')
  })
  it('沿用上次的端与企业', () => {
    expect(landingPath({ me: me('admin'), companies: [A, U], lastPortal: 'app', lastCompanyId: 2 })).toBe(
      '/app/2/monitor',
    )
  })
  it('默认顺序：平台 → 企业 → 数据 → 无企业', () => {
    expect(landingPath({ me: me('admin'), companies: [] })).toBe('/admin')
    expect(landingPath({ me: me(), companies: [U, A] })).toBe('/tenant/1')
    expect(landingPath({ me: me(), companies: [U] })).toBe('/app/2/monitor')
    expect(landingPath({ me: me(), companies: [X] })).toBe('/no-company')
  })
})

describe('路径解析与权限', () => {
  it('parsePortalPath', () => {
    expect(parsePortalPath('/admin/users')).toEqual({ portal: 'admin', companyId: null })
    expect(parsePortalPath('/tenant/12/sites')).toEqual({ portal: 'tenant', companyId: 12 })
    expect(parsePortalPath('/screen/3')).toEqual({ portal: 'screen', companyId: 3 })
    expect(parsePortalPath('/administrator')).toBeNull()
  })
  it('isPathAllowed', () => {
    expect(isPathAllowed('/tenant/2', me(), [U])).toBe(false)
    expect(isPathAllowed('/screen/2', me(), [U])).toBe(true)
    expect(isPathAllowed('/account', me(), [])).toBe(true)
    expect(isPathAllowed('/login', me(), [U])).toBe(false)
  })
  it('switchPortalPath 沿用当前企业', () => {
    expect(switchPortalPath('app', [A, U], 1)).toBe('/app/1/monitor')
    expect(switchPortalPath('tenant', [A, U], 2)).toBe('/tenant/1')
  })
})
