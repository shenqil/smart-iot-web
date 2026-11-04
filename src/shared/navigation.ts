/** 在组件外 (错误处理、会话过期) 发起路由跳转：由 router 创建后注册 */
type NavigateFn = (to: string, opts?: { replace?: boolean }) => void

let navigateImpl: NavigateFn = (to) => window.location.assign(to)

export const registerNavigate = (fn: NavigateFn) => {
  navigateImpl = fn
}
export const navigateTo: NavigateFn = (to, opts) => navigateImpl(to, opts)

export const currentPath = () => `${window.location.pathname}${window.location.search}`

export const isMobilePath = (path: string) => {
  const pathname = path.split(/[?#]/)[0]
  return pathname === '/h5' || pathname.startsWith('/h5/')
}
export const entryPath = (path = currentPath()) => (isMobilePath(path) ? '/h5' : '/')

export function loginPath(redirect?: string) {
  const target = isMobilePath(redirect ?? currentPath()) ? '/h5/login' : '/login'
  const pathname = redirect?.split(/[?#]/)[0]
  return redirect &&
    pathname !== '/' &&
    pathname !== '/h5' &&
    pathname !== '/h5/' &&
    pathname !== '/login' &&
    pathname !== '/h5/login'
    ? `${target}?redirect=${encodeURIComponent(redirect)}`
    : target
}
