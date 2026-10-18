import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { PageParams } from '@/api/types'

export type FilterValueType = 'string' | 'number' | 'boolean'

export interface UsePageQueryOptions {
  /** 每页条数默认值 */
  pageSize?: number
  /** 默认排序 (如 -createdAt) */
  sort?: string
  /** 筛选项及其值类型 (决定从网址读出时如何转换) */
  filters?: Record<string, FilterValueType>
  /** 同步到网址 (默认 true)。同一页面有多个表格时用 prefix 区分；弹窗内的表格传 false */
  urlSync?: boolean
  prefix?: string
}

const parse = (raw: string | null, type: FilterValueType) => {
  if (raw == null || raw === '') return undefined
  if (type === 'number') {
    const n = Number(raw)
    return Number.isFinite(n) ? n : undefined
  }
  if (type === 'boolean') return raw === 'true'
  return raw
}

/**
 * 列表参数：page / pageSize / keyword / sort / 筛选项，默认同步到网址 (刷新、分享、返回都保留)
 * 修改筛选或关键字时自动回到第 1 页
 */
export function usePageQuery(opts: UsePageQueryOptions = {}) {
  const { pageSize: defaultSize = 20, sort: defaultSort, filters = {}, urlSync = true, prefix = '' } = opts
  const [params, setParams] = useSearchParams()
  const [local, setLocal] = useState<Record<string, string>>({})
  const filtersKey = JSON.stringify(filters)

  const read = useCallback(
    (k: string) => (urlSync ? params.get(prefix + k) : (local[k] ?? null)),
    [urlSync, params, prefix, local],
  )

  const query = useMemo<PageParams>(() => {
    const q: PageParams = {
      page: Math.max(1, Number(read('page')) || 1),
      pageSize: Math.min(200, Number(read('pageSize')) || defaultSize),
      keyword: read('keyword') || undefined,
      sort: read('sort') ?? defaultSort,
    }
    for (const [k, t] of Object.entries(JSON.parse(filtersKey) as Record<string, FilterValueType>)) {
      const v = parse(read(k), t)
      if (v !== undefined) q[k] = v
    }
    return q
  }, [read, defaultSize, defaultSort, filtersKey])

  /** 合并更新参数；值为 undefined / '' 表示清除。除翻页外的修改都会回到第 1 页 */
  const update = useCallback(
    (patch: Partial<PageParams>) => {
      const resetPage = !('page' in patch) && !('pageSize' in patch && Object.keys(patch).length === 1)
      const apply = (get: (k: string) => string | null, set: (k: string, v: string | null) => void) => {
        for (const [k, v] of Object.entries(patch)) set(k, v === undefined || v === '' || v === null ? null : String(v))
        if (resetPage && get('page')) set('page', null)
      }
      if (urlSync) {
        setParams(
          (prev) => {
            const p = new URLSearchParams(prev)
            apply(
              (k) => p.get(prefix + k),
              (k, v) => (v == null ? p.delete(prefix + k) : p.set(prefix + k, v)),
            )
            return p
          },
          { replace: true },
        )
      } else {
        setLocal((prev) => {
          const next = { ...prev }
          apply(
            (k) => next[k] ?? null,
            (k, v) => {
              if (v == null) delete next[k]
              else next[k] = v
            },
          )
          return next
        })
      }
    },
    [urlSync, setParams, prefix],
  )

  const reset = useCallback(() => {
    const cleared: Partial<PageParams> = { keyword: undefined, sort: undefined, page: undefined }
    for (const k of Object.keys(JSON.parse(filtersKey))) cleared[k] = undefined
    update(cleared)
  }, [update, filtersKey])

  return { query, update, reset }
}

/** antd Table 排序 ↔ 后端 sort 串 (-field 倒序) */
export const toSortParam = (field: string | undefined, order: 'ascend' | 'descend' | null | undefined) =>
  field && order ? (order === 'descend' ? `-${field}` : field) : undefined

export const sortOrderOf = (sort: string | undefined, field: string): 'ascend' | 'descend' | null => {
  if (!sort) return null
  const first = sort.split(',')[0]
  if (first === field) return 'ascend'
  if (first === `-${field}`) return 'descend'
  return null
}
