import { AppstoreOutlined } from '@ant-design/icons'
import { Button, Input, Popover, Space, Tooltip } from 'antd'
import { type ReactNode, useState } from 'react'

/**
 * 名称输入 + 标准模板快捷填入：
 * - 用户可直接在输入框输入自定义名称
 * - 也可点击右侧「标准」按钮从模板库选择，选中后将模板名称及默认参数填入草稿，之后仍可继续修改
 */
export function PresetNameInput<T extends { id: number; name: string }>({
  value,
  placeholder,
  buttonTooltip,
  options,
  renderMeta,
  onChange,
  onSelectPreset,
}: {
  value?: string
  placeholder: string
  buttonTooltip: string
  options: T[]
  renderMeta?: (item: T) => ReactNode
  onChange: (value: string) => void
  onSelectPreset: (item: T) => void
}) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')

  const q = keyword.trim().toLowerCase()
  const filtered = q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options

  const content = (
    <div className="w-60">
      <Input
        size="small"
        allowClear
        autoFocus
        placeholder="搜索标准名称"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="mb-1.5"
      />
      <div className="max-h-56 overflow-y-auto">
        {filtered.length > 0 ? (
          filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-fill-secondary"
              onClick={() => {
                onSelectPreset(item)
                setOpen(false)
                setKeyword('')
              }}
            >
              <span className="truncate">{item.name}</span>
              {renderMeta && <span className="shrink-0 text-fg-tertiary text-xs">{renderMeta(item)}</span>}
            </button>
          ))
        ) : (
          <div className="py-3 text-center text-fg-tertiary text-xs">暂无匹配模板</div>
        )}
      </div>
    </div>
  )

  return (
    <Space.Compact className="w-full">
      <Input
        size="small"
        maxLength={100}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
      <Popover
        trigger="click"
        placement="bottomRight"
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setKeyword('')
        }}
        content={content}
      >
        <Tooltip title={buttonTooltip}>
          <Button size="small" icon={<AppstoreOutlined />}>
            标准
          </Button>
        </Tooltip>
      </Popover>
    </Space.Compact>
  )
}
