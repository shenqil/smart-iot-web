import { describe, expect, it } from 'vitest'
import { entryPath, isMobilePath, loginPath } from './navigation'

describe('端感知登录与返回', () => {
  it('移动端携带原路径，登录页不会递归嵌套 redirect', () => {
    expect(loginPath('/h5/12/home?siteId=4')).toBe('/h5/login?redirect=%2Fh5%2F12%2Fhome%3FsiteId%3D4')
    expect(loginPath('/h5/login?redirect=x')).toBe('/h5/login')
    expect(loginPath('/h5')).toBe('/h5/login')
  })
  it('PC 原有路径与端边界保持不变', () => {
    expect(loginPath('/app/12/monitor')).toBe('/login?redirect=%2Fapp%2F12%2Fmonitor')
    expect(loginPath('/login?redirect=x')).toBe('/login')
    expect(entryPath('/h5/1/home')).toBe('/h5')
    expect(entryPath('/admin')).toBe('/')
    expect(isMobilePath('/h5-other')).toBe(false)
    expect(loginPath('/h5?from=mobile')).toBe('/h5/login')
  })
})
