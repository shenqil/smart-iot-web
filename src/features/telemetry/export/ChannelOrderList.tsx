import { ArrowDownOutlined, ArrowUpOutlined, HolderOutlined } from '@ant-design/icons'
import { Button, Checkbox, Empty, Space, Tooltip } from 'antd'
import { useState } from 'react'
import { channelHeader, type SensorConfig } from '../lib/exportData'
import { type ChannelSelection, defaultSelection, moveItem } from './channelSelection'

/**
 * 导出通道：勾选 + 排序 (拖动或上下按钮)，顺序即 Excel 列顺序 (时间列恒在第一列)
 */
export function ChannelOrderList({
  sensors,
  value,
  onChange,
}: {
  sensors: SensorConfig[]
  value: ChannelSelection
  onChange: (v: ChannelSelection) => void
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const byNum = new Map(sensors.map((s) => [s.channelNum, s]))
  const checked = new Set(value.checked)
  const allChecked = value.order.length > 0 && value.order.every((n) => checked.has(n))

  if (!sensors.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该设备还没有配置传感器通道" />

  const move = (from: number, to: number) => onChange({ ...value, order: moveItem(value.order, from, to) })
  const toggle = (n: number, on: boolean) =>
    onChange({ ...value, checked: on ? [...value.checked, n] : value.checked.filter((x) => x !== n) })

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <Checkbox
          checked={allChecked}
          indeterminate={!allChecked && value.checked.length > 0}
          onChange={(e) => onChange({ ...value, checked: e.target.checked ? [...value.order] : [] })}
        >
          全选
        </Checkbox>
        <span className="text-fg-secondary text-sm">
          已选 {value.checked.length} / {value.order.length} 个通道，拖动或用箭头调整列顺序
        </span>
        <Button type="link" size="small" className="ml-auto" onClick={() => onChange(defaultSelection(sensors))}>
          恢复默认 (按通道号、全选)
        </Button>
      </div>
      <ul className="m-0 max-h-[420px] list-none overflow-y-auto rounded-md border border-line border-solid p-0">
        {value.order.map((n, i) => {
          const s = byNum.get(n)
          if (!s) return null
          return (
            <li
              key={n}
              draggable
              onDragStart={(e) => {
                setDragFrom(i)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(i)
              }}
              onDragLeave={() => setDragOver((v) => (v === i ? null : v))}
              onDrop={(e) => {
                e.preventDefault()
                if (dragFrom != null) move(dragFrom, i)
                setDragFrom(null)
                setDragOver(null)
              }}
              onDragEnd={() => {
                setDragFrom(null)
                setDragOver(null)
              }}
              className={`flex items-center gap-3 border-line border-b border-solid px-3 py-2 last:border-b-0 ${
                dragOver === i && dragFrom !== i ? 'bg-primary-bg' : ''
              } ${dragFrom === i ? 'opacity-50' : ''} ${checked.has(n) ? '' : 'text-fg-tertiary'}`}
            >
              <HolderOutlined className="cursor-grab text-fg-tertiary" aria-label="拖动排序" />
              <Checkbox checked={checked.has(n)} onChange={(e) => toggle(n, e.target.checked)} />
              <span className="w-14 shrink-0 font-mono text-fg-tertiary text-xs">CH {n}</span>
              <span className="min-w-0 flex-1 truncate">{channelHeader(s)}</span>
              <Space size={0}>
                <Tooltip title="上移">
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowUpOutlined />}
                    aria-label="上移"
                    disabled={i === 0}
                    onClick={() => move(i, i - 1)}
                  />
                </Tooltip>
                <Tooltip title="下移">
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowDownOutlined />}
                    aria-label="下移"
                    disabled={i === value.order.length - 1}
                    onClick={() => move(i, i + 1)}
                  />
                </Tooltip>
              </Space>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
