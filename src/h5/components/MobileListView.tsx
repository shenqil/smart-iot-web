import { InfiniteScroll, PullToRefresh } from 'antd-mobile'
import type { ReactNode } from 'react'
import { Empty, Failure, Loading } from './primitives'

export interface MobileListViewProps<T> {
  items: readonly T[]
  renderItem: (item: T, index: number) => ReactNode
  keyExtractor: (item: T, index: number) => string | number
  isPending?: boolean
  isError?: boolean
  error?: unknown
  onRetry?: () => void
  hasMore?: boolean
  loadMore?: () => Promise<void>
  onRefresh?: () => Promise<void>
  emptyTitle?: string
  emptyContent?: ReactNode
  header?: ReactNode
  footer?: ReactNode
}

/**
 * 标准移动端列表视图容器：
 * 统一收敛 PullToRefresh (下拉刷新) + InfiniteScroll (触底分页) + 骨架/加载态 + 错误重试 + 空状态
 */
export function MobileListView<T>({
  items,
  renderItem,
  keyExtractor,
  isPending = false,
  isError = false,
  error,
  onRetry,
  hasMore = false,
  loadMore,
  onRefresh,
  emptyTitle = '暂无数据',
  emptyContent,
  header,
  footer,
}: MobileListViewProps<T>) {
  const content = (
    <div className="h5-list-view">
      {header}
      {isPending && !items.length ? (
        <Loading />
      ) : isError && !items.length ? (
        <Failure error={error} retry={onRetry} />
      ) : items.length ? (
        <div className="h5-list-body">
          {items.map((item, index) => (
            <div key={keyExtractor(item, index)} className="h5-list-item-wrapper">
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      ) : (
        <Empty title={emptyTitle}>{emptyContent}</Empty>
      )}

      {isError && items.length > 0 && <Failure error={error} retry={onRetry} />}

      {loadMore && <InfiniteScroll hasMore={hasMore && !isError} loadMore={loadMore} />}
      {footer}
    </div>
  )

  if (onRefresh) {
    return <PullToRefresh onRefresh={onRefresh}>{content}</PullToRefresh>
  }

  return content
}
