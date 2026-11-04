import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Select } from 'antd'

export interface SlicePagerProps {
  page: number
  pageSize: number
  /** 后端 hasMore：是否还有下一页 */
  hasMore: boolean
  /** 当前页条数 */
  count: number
  onChange: (page: number, pageSize: number) => void
  pageSizeOptions?: number[]
  disabled?: boolean
}

/**
 * 简单分页 (告警、操作记录不返回总数)：上一页 / 下一页，hasMore 决定下一页是否可点 (FRONTEND_DESIGN §2.4)
 */
export function SlicePager({
  page,
  pageSize,
  hasMore,
  count,
  onChange,
  pageSizeOptions = [10, 20, 50, 100],
  disabled,
}: SlicePagerProps) {
  const from = count ? (page - 1) * pageSize + 1 : 0
  return (
    <div className="mt-3 flex flex-wrap items-center justify-end gap-2 text-sm">
      <span className="text-fg-secondary">
        {count ? `第 ${from}–${from + count - 1} 条` : page > 1 ? '本页没有数据' : ''}
      </span>
      <Button
        size="small"
        icon={<LeftOutlined />}
        aria-label="上一页"
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1, pageSize)}
      />
      <span className="min-w-12 text-center">第 {page} 页</span>
      <Button
        size="small"
        icon={<RightOutlined />}
        aria-label="下一页"
        disabled={disabled || !hasMore}
        onClick={() => onChange(page + 1, pageSize)}
      />
      <Select
        size="small"
        value={pageSize}
        style={{ width: 96 }}
        options={pageSizeOptions.map((n) => ({ value: n, label: `${n} 条/页` }))}
        onChange={(n) => onChange(1, n)}
      />
    </div>
  )
}
