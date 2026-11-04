import { CloseOutlined, SearchOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Empty, Input, Modal, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { type Key, type ReactNode, useEffect, useState } from 'react'
import type { PageResult } from '@/api/page'
import { handleGlobalError } from '@/app/queryClient'

export interface RelationRoleOption {
  value: string
  label: string
}

export interface RelationModalProps<T> {
  open: boolean
  title: ReactNode
  /** "未关联" 列表 (后端 /available 接口) */
  queryKey: readonly unknown[]
  fetchAvailable: (q: { page: number; pageSize: number; keyword?: string }) => Promise<PageResult<T>>
  rowKey: (row: T) => Key
  columns: ColumnsType<T>
  /** 右侧"已选"中显示的名称 */
  label: (row: T) => ReactNode
  keywordPlaceholder?: string
  /** 需要为每一项选择角色时传入 (如企业成员) */
  roles?: { options: RelationRoleOption[]; defaultValue: string }
  /** 单次最多选择 (后端批量上限) */
  max?: number
  okText?: string
  onConfirm: (items: { key: Key; row: T; role?: string }[]) => Promise<unknown>
  onClose: () => void
}

/**
 * 关联选择器 (FRONTEND_DESIGN §7)：左"可选"(分页搜索)、右"已选"(跨页保留，可选角色)。
 * 用于企业分配成员、企业授权设备、设备授权企业等"已关联 / 未关联"场景
 */
export function RelationModal<T extends object>(props: RelationModalProps<T>) {
  const { max = 500 } = props
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [input, setInput] = useState('')
  const [picked, setPicked] = useState<Map<Key, { row: T; role?: string }>>(new Map())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (props.open) {
      setPage(1)
      setKeyword('')
      setInput('')
      setPicked(new Map())
    }
  }, [props.open])

  const { data, isFetching } = useQuery({
    queryKey: [...props.queryKey, 'available', { page, keyword }],
    queryFn: () => props.fetchAvailable({ page, pageSize: 10, keyword: keyword || undefined }),
    enabled: props.open,
    placeholderData: keepPreviousData,
  })

  const toggle = (rows: T[], checked: boolean) =>
    setPicked((prev) => {
      const next = new Map(prev)
      for (const row of rows) {
        const k = props.rowKey(row)
        if (checked && !next.has(k) && next.size < max) next.set(k, { row, role: props.roles?.defaultValue })
        if (!checked) next.delete(k)
      }
      return next
    })

  const confirm = async () => {
    setSaving(true)
    try {
      await props.onConfirm([...picked].map(([key, v]) => ({ key, ...v })))
      props.onClose()
    } catch (e) {
      handleGlobalError(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={props.open}
      title={props.title}
      width={960}
      onCancel={props.onClose}
      destroyOnHidden
      okText={`${props.okText ?? '确定'}${picked.size ? ` (${picked.size})` : ''}`}
      okButtonProps={{ disabled: picked.size === 0, loading: saving }}
      onOk={confirm}
    >
      <div className="grid grid-cols-[1fr_300px] gap-4">
        <div className="layout-fill h-[520px] min-w-0">
          <Input
            allowClear
            className="mb-3"
            prefix={<SearchOutlined className="text-fg-tertiary" />}
            placeholder={props.keywordPlaceholder ?? '搜索'}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              if (!e.target.value) {
                setKeyword('')
                setPage(1)
              }
            }}
            onPressEnter={() => {
              setKeyword(input.trim())
              setPage(1)
            }}
          />
          <Table<T>
            size="small"
            rowKey={props.rowKey as never}
            loading={isFetching}
            columns={props.columns}
            dataSource={data?.records ?? []}
            rootClassName="layout-fill"
            scroll={{ x: 'max-content', y: 400 }}
            rowSelection={{
              selectedRowKeys: [...picked.keys()],
              preserveSelectedRowKeys: true,
              onSelect: (row, checked) => toggle([row], checked),
              onSelectAll: (checked, _rows, changed) => toggle(changed, checked),
            }}
            onRow={(row) => ({
              onClick: () => toggle([row], !picked.has(props.rowKey(row))),
              className: 'cursor-pointer',
            })}
            pagination={{
              current: page,
              pageSize: 10,
              total: data?.totalCount ?? 0,
              size: 'small',
              showSizeChanger: false,
              showTotal: (t) => `可选 ${t} 项`,
              onChange: setPage,
            }}
          />
        </div>
        <div className="flex h-[520px] flex-col rounded-md border border-line border-solid">
          <div className="flex items-center justify-between border-line border-b border-solid px-3 py-2">
            <span className="font-medium">已选 {picked.size}</span>
            {picked.size > 0 && (
              <Button type="link" size="small" onClick={() => setPicked(new Map())}>
                清空
              </Button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {picked.size === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="在左侧勾选" />
            ) : (
              [...picked].map(([k, v]) => (
                <div key={String(k)} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-layout">
                  <span className="min-w-0 flex-1 truncate">{props.label(v.row)}</span>
                  {props.roles && (
                    <Select
                      size="small"
                      className="w-24"
                      value={v.role}
                      options={props.roles.options}
                      onChange={(role) => setPicked((prev) => new Map(prev).set(k, { ...v, role }))}
                    />
                  )}
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    aria-label="移除"
                    onClick={() => toggle([v.row], false)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
