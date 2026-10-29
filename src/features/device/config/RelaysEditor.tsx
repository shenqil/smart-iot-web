import { DeleteOutlined, PlusOutlined, UndoOutlined } from '@ant-design/icons'
import { Badge, Button, Input, Select, Space, Switch, Table, Tooltip } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { OssUpload } from '@/components/form/OssUpload'
import { useStandardRelays } from '@/features/dict/api'
import type { RelayFields, RelayView } from './api'

/** 编辑中的继电器通道：standardName 只用于显示 (不提交) */
type RelayDraft = RelayFields & { standardName?: string }
type Row = { channel: number; cfg?: RelayDraft }

const toDraft = (r: RelayView): RelayDraft => ({
  channel: r.channel,
  standardRelayId: r.standardRelayId,
  standardName: r.standardName || undefined,
  name: r.name || undefined,
  iconUrl: r.iconUrl || undefined,
})

/** 继电器配置编辑器 (平台与企业共用)：配置了的通道才能在数据端控制 */
export function RelaysEditor({
  relays,
  maxChannels,
  saving,
  onSave,
  onDirtyChange,
}: {
  relays: RelayView[]
  maxChannels: number
  saving: boolean
  onSave: (relays: RelayFields[]) => Promise<unknown>
  onDirtyChange?: (dirty: boolean) => void
}) {
  const std = useStandardRelays()
  const original = useMemo(() => relays.map(toDraft), [relays])
  const [list, setList] = useState<RelayDraft[]>(original)
  const [showEmpty, setShowEmpty] = useState(maxChannels <= 64)
  useEffect(() => setList(original), [original])
  const dirty = JSON.stringify(list) !== JSON.stringify(original)
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange])

  const byChannel = new Map(list.map((r) => [r.channel, r]))
  const patch = (ch: number, p: Partial<RelayDraft>) =>
    setList((l) => l.map((r) => (r.channel === ch ? { ...r, ...p } : r)))
  const free = Array.from({ length: maxChannels }, (_, i) => i).filter((i) => !byChannel.has(i))
  const rows: Row[] = showEmpty
    ? Array.from({ length: maxChannels }, (_, i) => ({ channel: i, cfg: byChannel.get(i) }))
    : [...list].sort((a, b) => a.channel - b.channel).map((r) => ({ channel: r.channel, cfg: r }))

  const save = () =>
    onSave(
      [...list]
        .sort((a, b) => a.channel - b.channel)
        .map(({ standardName: _s, ...r }) => ({ ...r, name: r.name?.trim() || undefined })),
    )

  return (
    <div className="layout-fill">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span>
          已配置 <b>{list.length}</b> / {maxChannels} 路
        </span>
        <Space size={6}>
          <Switch size="small" checked={showEmpty} onChange={setShowEmpty} />
          <span className="text-fg-secondary">显示未配置通道</span>
        </Space>
        {!showEmpty && free.length > 0 && (
          <Button size="small" icon={<PlusOutlined />} onClick={() => setList([...list, { channel: free[0] }])}>
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
        rowKey="channel"
        dataSource={rows}
        pagination={rows.length > 64 ? { pageSize: 64, showSizeChanger: false } : false}
        rootClassName="layout-fill"
        scroll={{ x: 'max-content', y: 400 }}
        rowClassName={(r) => (r.cfg ? '' : 'opacity-70')}
        columns={[
          {
            title: '通道',
            dataIndex: 'channel',
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
                  value={r.cfg.iconUrl}
                  onChange={(iconUrl) => patch(r.channel, { iconUrl })}
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
                  value={r.cfg.standardRelayId ?? undefined}
                  options={std.list.map((s) => ({ value: s.id, label: s.name }))}
                  onChange={(id) => {
                    const d = id != null ? std.byId.get(id) : undefined
                    patch(r.channel, { standardRelayId: d?.id, standardName: d?.name, iconUrl: r.cfg?.iconUrl })
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
                  value={r.cfg.name ?? ''}
                  onChange={(e) => patch(r.channel, { name: e.target.value })}
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
                    onClick={() => setList(list.filter((x) => x.channel !== r.channel))}
                  />
                </Tooltip>
              ) : (
                <Button size="small" icon={<PlusOutlined />} onClick={() => setList([...list, { channel: r.channel }])}>
                  配置
                </Button>
              ),
          },
        ]}
      />
    </div>
  )
}
