/** 在组件外 (错误处理、会话过期) 发起路由跳转：由 router 创建后注册 */
type NavigateFn = (to: string, opts?: { replace?: boolean }) => void

let navigateImpl: NavigateFn = (to) => window.location.assign(to)

export const registerNavigate = (fn: NavigateFn) => {
  navigateImpl = fn
}
export const navigateTo: NavigateFn = (to, opts) => navigateImpl(to, opts)

export const currentPath = () => `${window.location.pathname}${window.location.search}`

export const loginPath = (redirect?: string) =>
  redirect && redirect !== '/' && !redirect.startsWith('/login')
    ? `/login?redirect=${encodeURIComponent(redirect)}`
    : '/login'
