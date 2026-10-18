import { DeleteOutlined, PlusOutlined, UndoOutlined } from '@ant-design/icons'
import { Badge, Button, Input, Select, Space, Switch, Table, Tooltip } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { OssUpload } from '@/components/form/OssUpload'
import { useStandardRelays } from '@/features/dict/api'
import type { RelayConfig } from './api'

type Row = { channelNum: number; cfg?: RelayConfig }

/** 继电器配置编辑器 (平台与企业共用)：配置了的通道才能在数据端控制 */
export function RelaysEditor({
  relays,
  maxChannels,
  saving,
  onSave,
  onDirtyChange,
}: {
  relays: RelayConfig[]
  maxChannels: number
  saving: boolean
  onSave: (relays: RelayConfig[]) => Promise<unknown>
  onDirtyChange?: (dirty: boolean) => void
}) {
  const std = useStandardRelays()
  const original = useMemo(() => relays, [relays])
  const [list, setList] = useState<RelayConfig[]>(original)
  const [showEmpty, setShowEmpty] = useState(maxChannels <= 64)
  useEffect(() => setList(original), [original])
  const dirty = JSON.stringify(list) !== JSON.stringify(original)
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange])

  const byChannel = new Map(list.map((r) => [r.channelNum, r]))
  const patch = (ch: number, p: Partial<RelayConfig>) =>
    setList((l) => l.map((r) => (r.channelNum === ch ? { ...r, ...p } : r)))
  const free = Array.from({ length: maxChannels }, (_, i) => i).filter((i) => !byChannel.has(i))
  const rows: Row[] = showEmpty
    ? Array.from({ length: maxChannels }, (_, i) => ({ channelNum: i, cfg: byChannel.get(i) }))
    : [...list].sort((a, b) => a.channelNum - b.channelNum).map((r) => ({ channelNum: r.channelNum, cfg: r }))

  const save = () =>
    onSave(
      [...list]
        .sort((a, b) => a.channelNum - b.channelNum)
        .map((r) => ({ ...r, displayName: r.displayName?.trim() || undefined })),
    )

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span>
          已配置 <b>{list.length}</b> / {maxChannels} 路
        </span>
        <Space size={6}>
          <Switch size="small" checked={showEmpty} onChange={setShowEmpty} />
          <span className="text-fg-secondary">显示未配置通道</span>
        </Space>
        {!showEmpty && free.length > 0 && (
          <Button size="small" icon={<PlusOutlined />} onClick={() => setList([...list, { channelNum: free[0] }])}>
            配置下一个空闲通道 (CH {free[0]})
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {dirty && <Badge status="warning" text="有未保存的修改" />}
          <Button icon={<UndoOutlined />} disabled={!dirty || saving} onClick={() => setList(original)}>
            撤销修改
          </Button>
          <Button type="primary" loading={saving} disabled={!dirty} onClick={save}>
            保存继电器配置
          </Button>
        </div>
      </div>
      <Table<Row>
        size="small"
        rowKey="channelNum"
        dataSource={rows}
        pagination={rows.length > 64 ? { pageSize: 64, showSizeChanger: false } : false}
        rowClassName={(r) => (r.cfg ? '' : 'opacity-70')}
        columns={[
          {
            title: '通道',
            dataIndex: 'channelNum',
            width: 72,
            render: (v, r) => (
              <span className={`font-mono ${r.cfg ? '' : 'text-fg-tertiary'}`}>CH {String(v).padStart(2, '0')}</span>
            ),
          },
          {
            title: '图标',
            width: 80,
            render: (_, r) =>
              r.cfg && (
                <OssUpload
                  scene="relay-icon"
                  size={32}
                  value={r.cfg.url}
                  onChange={(url) => patch(r.channelNum, { url })}
                />
              ),
          },
          {
            title: '标准继电器',
            width: 180,
            render: (_, r) =>
              r.cfg ? (
                <Select
                  size="small"
                  className="w-40"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="选择后自动带出"
                  value={r.cfg.standardId ?? undefined}
                  options={std.list.map((s) => ({ value: s.id, label: s.name }))}
                  onChange={(id) => {
                    const d = id != null ? std.byId.get(id) : undefined
                    patch(r.channelNum, { standardId: d?.id, standardName: d?.name, url: d?.url || r.cfg?.url })
                  }}
                />
              ) : (
                <span className="text-fg-tertiary">未配置 (数据端不可控制)</span>
              ),
          },
          {
            title: '显示名称',
            render: (_, r) =>
              r.cfg && (
                <Input
                  size="small"
                  className="max-w-72"
                  maxLength={100}
                  placeholder={r.cfg.standardName || '如 1 号棚灌溉主阀'}
                  value={r.cfg.displayName ?? ''}
                  onChange={(e) => patch(r.channelNum, { displayName: e.target.value })}
                />
              ),
          },
          {
            title: '操作',
            width: 90,
            render: (_, r) =>
              r.cfg ? (
                <Tooltip title="清空该通道配置">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => setList(list.filter((x) => x.channelNum !== r.channelNum))}
                  />
                </Tooltip>
              ) : (
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setList([...list, { channelNum: r.channelNum }])}
                >
                  配置
                </Button>
              ),
          },
        ]}
      />
    </div>
  )
}
