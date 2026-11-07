/** 只将数据使用端送入 H5；企业管理、平台和大屏仍使用各自的 PC 入口。 */
export function mobileEquivalent(pathname: string, search: string): string | null {
  const match = /^\/app\/(\d+)(?:\/(monitor|alarms|operations|history|comparison))?\/?$/.exec(pathname)
  if (!match) return null
  const params = new URLSearchParams(search)
  const tab = match[2]
  if (tab === 'history' || tab === 'comparison') {
    params.set('tab', tab)
  }
  const page =
    tab === 'alarms'
      ? 'alarms'
      : tab === 'operations'
        ? 'operations'
        : params.has('deviceId')
          ? 'devices'
          : params.has('siteId')
            ? 'devices'
            : 'home'
  return `/h5/${match[1]}/${page}${params.size ? `?${params}` : ''}`
}
export const prefersMobile = () => window.matchMedia?.('(max-width: 768px) and (pointer: coarse)').matches === true
