import type { DeviceFilters } from './api'
export const positiveId = (v: string | null | undefined) => {
  const n = Number(v)
  return Number.isSafeInteger(n) && n > 0 ? n : undefined
}
export function readDeviceFilters(p: URLSearchParams): DeviceFilters {
  const cap = p.get('capability')
  return {
    siteId: positiveId(p.get('siteId')),
    deviceTypeId: positiveId(p.get('deviceTypeId')),
    unclassified: p.get('unclassified') === 'true' || undefined,
    online: ['true', 'false'].includes(p.get('online') ?? '') ? (p.get('online') as 'true' | 'false') : undefined,
    keyword: p.get('keyword')?.trim() || undefined,
    capability: ['sensor', 'relay', 'camera'].includes(cap ?? '') ? (cap as DeviceFilters['capability']) : undefined,
    hasAlarm: p.get('hasAlarm') === 'true' || undefined,
  }
}
