import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table, type TableProps, Tooltip } from 'antd'
import type { ColumnsType, ColumnType } from 'antd/es/table'
import { type Key, type ReactNode, useEffect, useMemo, useState } from 'react'
import type { PageResult } from '@/api/page'
import type { PageParams } from '@/api/types'
import { type FilterValueType, sortOrderOf, toSortParam, usePageQuery } from './usePageQuery'

export interface FilterField {
  name: string
  placeholder: string
  type?: FilterValueType
  options: { value: string | number | boolean; label: ReactNode }[]
  width?: number
}

/** 列定义：sortField 声明后端可排序字段 (必须在后端白名单内) */
export type PageColumn<T> = ColumnType<T> & { sortField?: string }

export interface PageTableProps<T> {
  /** 查询缓存键前缀，最终 key = [...queryKey, query] */
  queryKey: readonly unknown[]
  fetcher: (q: PageParams) => Promise<PageResult<T>>
  columns: PageColumn<T>[]
  rowKey: string | ((row: T) => Key)
  keywordPlaceholder?: string
  filters?: FilterField[]
  /** 右上角按钮 (新建等) */
  toolbar?: ReactNode
  /** 选中行后出现的批量操作；clear 用于操作完成后清空选择 */
  batchActions?: (keys: Key[], rows: T[], clear: () => void) => ReactNode
  /** 行是否可选 (返回 false 禁用勾选) */
  selectable?: (row: T) => boolean
  defaultSort?: string
  pageSize?: number
  /** 网址同步：多个表格同页时用 prefix 区分；弹窗内传 urlSync=false */
  urlSync?: boolean
  prefix?: string
  /** 不包 Card (嵌在标签页 / 卡片内时使用) */
  bare?: boolean
  tableProps?: Omit<TableProps<T>, 'columns' | 'dataSource' | 'rowKey' | 'pagination' | 'onChange'>
}

/**
 * 通用列表 (FRONTEND_DESIGN §7)：筛选栏 + 表格 + 分页 + 排序 + 批量选择，参数同步网址。
 * 后端分页约定：page / pageSize (≤200) / keyword / sort → {records, totalCount}
 */
export function PageTable<T extends object>(props: PageTableProps<T>) {
  const {
    queryKey,
    fetcher,
    columns,
    rowKey,
    keywordPlaceholder = '关键字',
    filters = [],
    toolbar,
    batchActions,
  } = props
  const filterTypes = useMemo(
    () => Object.fromEntries(filters.map((f) => [f.name, f.type ?? 'string'])) as Record<string, FilterValueType>,
    [filters],
  )
  const { query, update, reset } = usePageQuery({
    pageSize: props.pageSize,
    sort: props.defaultSort,
    filters: filterTypes,
    urlSync: props.urlSync,
    prefix: props.prefix,
  })
  const [keyword, setKeyword] = useState(query.keyword ?? '')
  useEffect(() => setKeyword(query.keyword ?? ''), [query.keyword])

  const [selected, setSelected] = useState<{ keys: Key[]; rows: T[] }>({ keys: [], rows: [] })
  const clear = () => setSelected({ keys: [], rows: [] })

  const { data, isFetching, refetch } = useQuery({
    queryKey: [...queryKey, query],
    queryFn: () => fetcher(query),
    placeholderData: keepPreviousData,
  })

  const tableColumns: ColumnsType<T> = columns.map(({ sortField, ...col }) =>
    sortField ? { ...col, key: sortField, sorter: true, sortOrder: sortOrderOf(query.sort, sortField) } : col,
  )

  const hasFilter = Boolean(query.keyword) || filters.some((f) => query[f.name] !== undefined)

  const body = (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          allowClear
          className="w-60"
          prefix={<SearchOutlined className="text-fg-tertiary" />}
          placeholder={keywordPlaceholder}
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value)
            if (!e.target.value) update({ keyword: undefined })
          }}
          onPressEnter={() => update({ keyword: keyword.trim() || undefined })}
          onBlur={() => keyword.trim() !== (query.keyword ?? '') && update({ keyword: keyword.trim() || undefined })}
        />
        {filters.map((f) => (
          <Select
            key={f.name}
            allowClear
            placeholder={f.placeholder}
            style={{ width: f.width ?? 140 }}
            value={query[f.name] as never}
            options={f.options as never}
            onChange={(v) => update({ [f.name]: v ?? undefined })}
          />
        ))}
        {hasFilter && (
          <Button type="link" onClick={reset}>
            重置
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Tooltip title="刷新">
            <Button icon={<ReloadOutlined spin={isFetching} />} onClick={() => refetch()} />
          </Tooltip>
          {toolbar}
        </div>
      </div>
      {batchActions && selected.keys.length > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-md bg-primary-bg px-4 py-2">
          <span>
            已选 <b>{selected.keys.length}</b> 项
          </span>
          <Space>{batchActions(selected.keys, selected.rows, clear)}</Space>
          <Button type="link" size="small" className="ml-auto" onClick={clear}>
            取消选择
          </Button>
        </div>
      )}
      <Table<T>
        {...props.tableProps}
        rowKey={rowKey as never}
        loading={isFetching && !data}
        columns={tableColumns}
        dataSource={data?.records ?? []}
        scroll={{ x: 'max-content', ...props.tableProps?.scroll }}
        rowSelection={
          batchActions
            ? {
                selectedRowKeys: selected.keys,
                preserveSelectedRowKeys: true,
                onChange: (keys, rows) => setSelected({ keys, rows }),
                getCheckboxProps: props.selectable ? (row) => ({ disabled: !props.selectable?.(row) }) : undefined,
              }
            : undefined
        }
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total: data?.totalCount ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (t) => `共 ${t} 条`,
        }}
        onChange={(pg, _f, sorter, extra) => {
          if (extra.action === 'paginate') {
            update({ page: pg.current, pageSize: pg.pageSize })
          } else if (extra.action === 'sort') {
            const s = Array.isArray(sorter) ? sorter[0] : sorter
            update({ sort: toSortParam(s.columnKey as string | undefined, s.order) })
          }
        }}
      />
    </>
  )
  return props.bare ? body : <Card variant="borderless">{body}</Card>
}
