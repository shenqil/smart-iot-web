import { AppstoreOutlined, ReloadOutlined, SearchOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  Button,
  Card,
  Empty,
  Input,
  Pagination,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  type TableProps,
  Tooltip,
} from 'antd'
import type { ColumnsType, ColumnType } from 'antd/es/table'
import { type Key, type ReactNode, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
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
  /** 卡片视图：传入后工具栏出现"表格 / 卡片"切换 (网址参数 view)；卡片模式不支持勾选与排序表头 */
  cardView?: CardViewOptions<T>
}

export interface CardViewOptions<T> {
  render: (row: T) => ReactNode
  /** 默认视图 (默认表格) */
  defaultView?: 'table' | 'card'
  /** 卡片最小宽度 (px)，按容器宽度自动排列 */
  minWidth?: number
}

/**
 * 通用列表 (FRONTEND_DESIGN §7)：筛选栏 + 表格 + 分页 + 排序 + 批量选择，参数同步网址。
 * 后端分页约定：page / pageSize (≤200) / keyword / sort → {records, totalCount}
 * 高度：占满父级剩余高度 (.layout-fill)，表体内滚动，筛选栏 / 表头 / 分页器固定；
 * 父级需接入撑满链 (布局 .page-content 直接子元素，或 .layout-fill 的 Card / Tabs 内)
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

  const [params, setParams] = useSearchParams()
  const viewParam = `${props.prefix ?? ''}view`
  const view = props.cardView ? (params.get(viewParam) ?? props.cardView.defaultView ?? 'table') : 'table'
  const setView = (v: string) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set(viewParam, v)
        return p
      },
      { replace: true },
    )

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
          {props.cardView && (
            <Segmented
              value={view}
              onChange={(v) => setView(String(v))}
              options={[
                { value: 'card', icon: <AppstoreOutlined />, title: '卡片' },
                { value: 'table', icon: <UnorderedListOutlined />, title: '表格' },
              ]}
            />
          )}
          <Tooltip title="刷新">
            <Button icon={<ReloadOutlined spin={isFetching} />} onClick={() => refetch()} />
          </Tooltip>
          {toolbar}
        </div>
      </div>
      {view === 'table' && batchActions && selected.keys.length > 0 && (
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
      {view === 'card' && props.cardView ? (
        <CardGrid
          rows={data?.records ?? []}
          loading={isFetching && !data}
          rowKey={rowKey}
          options={props.cardView}
          page={query.page}
          pageSize={query.pageSize}
          total={data?.totalCount ?? 0}
          onPage={(page, pageSize) => update({ page, pageSize })}
        />
      ) : (
        <Table<T>
          {...props.tableProps}
          rootClassName={['layout-fill', props.tableProps?.rootClassName].filter(Boolean).join(' ')}
          rowKey={rowKey as never}
          loading={isFetching && !data}
          columns={tableColumns}
          dataSource={data?.records ?? []}
          // y 仅用于开启固定表头，实际高度由 .layout-fill 撑满
          scroll={{ x: 'max-content', y: 400, ...props.tableProps?.scroll }}
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
      )}
    </>
  )
  return props.bare ? (
    <div className="layout-fill">{body}</div>
  ) : (
    <Card variant="borderless" className="layout-fill">
      {body}
    </Card>
  )
}

/** 卡片视图：容器内滚动，分页器固定在底部 */
function CardGrid<T extends object>(p: {
  rows: T[]
  loading: boolean
  rowKey: string | ((row: T) => Key)
  options: CardViewOptions<T>
  page: number
  pageSize: number
  total: number
  onPage: (page: number, pageSize: number) => void
}) {
  const keyOf = (row: T) =>
    typeof p.rowKey === 'function' ? p.rowKey(row) : ((row as Record<string, unknown>)[p.rowKey] as Key)
  return (
    <div className="layout-fill">
      <Spin spinning={p.loading} wrapperClassName="layout-fill min-h-0 overflow-y-auto">
        {p.rows.length === 0 && !p.loading ? (
          <Empty className="py-12" />
        ) : (
          <div
            className="grid gap-4 pb-1"
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${p.options.minWidth ?? 260}px, 1fr))` }}
          >
            {p.rows.map((row) => (
              <div key={String(keyOf(row))}>{p.options.render(row)}</div>
            ))}
          </div>
        )}
      </Spin>
      <Pagination
        className="mt-4 justify-end"
        current={p.page}
        pageSize={p.pageSize}
        total={p.total}
        showSizeChanger
        pageSizeOptions={[12, 24, 48, 96]}
        showTotal={(t) => `共 ${t} 条`}
        onChange={p.onPage}
      />
    </div>
  )
}
