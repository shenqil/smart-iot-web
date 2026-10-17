/** 后端统一分页响应 */
export interface PageResult<T> {
  records: T[] | null
  totalCount: number
  page: number
  pageSize: number
}

export const MAX_PAGE_SIZE = 200

/** 循环取完全部分页 (用于设备树、地图标点等需要全量的场景)；maxPages 防止失控 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, pageSize: number) => Promise<PageResult<T>>,
  maxPages = 25,
): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; page <= maxPages; page++) {
    const r = await fetchPage(page, MAX_PAGE_SIZE)
    out.push(...(r.records ?? []))
    if (out.length >= r.totalCount || (r.records ?? []).length < MAX_PAGE_SIZE) break
  }
  return out
}
