import type { paths } from './schema'

/** 某个 GET 接口的 query 参数类型，如 QueryOf<'/api/v1/admin/companies'> */
export type QueryOf<P extends keyof paths> = paths[P] extends { get: { parameters: { query?: infer Q } } }
  ? NonNullable<Q>
  : never

/** 列表通用参数 (分页 / 关键字 / 排序 + 各接口自己的筛选项) */
export interface PageParams {
  page: number
  pageSize: number
  keyword?: string
  sort?: string
  [filter: string]: string | number | boolean | undefined
}
