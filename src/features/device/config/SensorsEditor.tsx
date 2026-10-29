import {
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  PlusOutlined,
  RightOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { Alert, Badge, Button, Dropdown, Input, InputNumber, Select, Space, Switch, Table, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { useStandardSensors } from '@/features/dict/api'
import { RESOLUTION_OPTIONS } from '@/lib/resolution'
import { AlertRulesEditor } from './AlertRulesEditor'
import type { SensorBody, SensorView } from './api'
import { CalibrationModal } from './CalibrationModal'
import {
  calibrationSummary,
  copyChannel,
  prepareSensors,
  type SensorDraft,
  toDraft,
  validateSensors,
} from './sensorRules'

type Row = { channel: number; cfg?: SensorDraft }

/**
 * 传感器配置编辑器 (FRONTEND_DESIGN §3.5，平台与企业共用)
 * 行 = 通道号 0 ~ sensorChannels-1；未配置的通道不提交；保存为整体替换
 */
export function SensorsEditor({
  sensors,
  maxChannels,
  saving,
  onSave,
  onDirtyChange,
}: {
  sensors: SensorView[]
  maxChannels: number
  saving: boolean
  onSave: (sensors: SensorBody[]) => Promise<unknown>
  onDirtyChange?: (dirty: boolean) => void
}) {
  const std = useStandardSensors()
  const original = useMemo(() => sensors.map(toDraft), [sensors])
  const [list, setList] = useState<SensorDraft[]>(original)
  const [expanded, setExpanded] = useState<number[]>([])
  const [showEmpty, setShowEmpty] = useState(maxChannels <= 64)
  const [correcting, setCorrecting] = useState<number | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => setList(original), [original])
  const dirty = JSON.stringify(list) !== JSON.stringify(original)
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange])

  const byChannel = new Map(list.map((s) => [s.channel, s]))
  const patch = (ch: number, p: Partial<SensorDraft>) =>
    setList((l) => l.map((s) => (s.channel === ch ? { ...s, ...p } : s)))
  const add = (cfg: SensorDraft) => setList((l) => [...l.filter((s) => s.channel !== cfg.channel), cfg])
  const clear = (ch: number) => setList((l) => l.filter((s) => s.channel !== ch))
  const free = Array.from({ length: maxChannels }, (_, i) => i).filter((i) => !byChannel.has(i))

  const rows: Row[] = showEmpty
    ? Array.from({ length: maxChannels }, (_, i) => ({ channel: i, cfg: byChannel.get(i) }))
    : [...list].sort((a, b) => a.channel - b.channel).map((s) => ({ channel: s.channel, cfg: s }))

  const applyStandard = (ch: number, id: number | undefined) => {
    const d = id != null ? std.byId.get(id) : undefined
    if (!d) return patch(ch, { standardSensorId: undefined, standardName: undefined })
    patch(ch, {
      standardSensorId: d.id,
      standardName: d.name,
      unit: d.unit || undefined,
      rangeMin: d.rangeMin,
      rangeMax: d.rangeMax,
      resolution: (d.resolution || undefined) as SensorBody['resolution'],
    })
  }

  const save = async () => {
    const errs = validateSensors(list, maxChannels)
    setErrors(errs)
    if (errs.length) return
    await onSave(prepareSensors(list))
  }

  const columns: ColumnsType<Row> = [
    {
      title: '通道',
      dataIndex: 'channel',
      width: 72,
      fixed: 'left',
      render: (v, r) => (
        <span className={`font-mono ${r.cfg ? '' : 'text-fg-tertiary'}`}>CH {String(v).padStart(2, '0')}</span>
      ),
    },
    {
      title: '标准传感器',
      width: 170,
      render: (_, r) =>
        r.cfg ? (
          <Select
            size="small"
            className="w-40"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="选择后自动带出"
            value={r.cfg.standardSensorId ?? undefined}
            options={std.list.map((s) => ({ value: s.id, label: s.name }))}
            onChange={(v) => applyStandard(r.channel, v)}
          />
        ) : (
          <span className="text-fg-tertiary">未配置</span>
        ),
    },
    {
      title: '显示名称',
      width: 180,
      render: (_, r) =>
        r.cfg && (
          <Input
            size="small"
            placeholder={r.cfg.standardName || '如 1 号棚空气温度'}
            maxLength={100}
            value={r.cfg.name ?? ''}
            onChange={(e) => patch(r.channel, { name: e.target.value })}
          />
        ),
    },
    {
      title: '单位',
      width: 90,
      render: (_, r) =>
        r.cfg && (
          <Input
            size="small"
            value={r.cfg.unit ?? ''}
            maxLength={20}
            onChange={(e) => patch(r.channel, { unit: e.target.value })}
          />
        ),
    },
    {
      title: '量程',
      width: 200,
      render: (_, r) =>
        r.cfg && (
          <Space size={4}>
            <InputNumber
              size="small"
              className="w-20"
              value={r.cfg.rangeMin ?? 0}
              onChange={(v) => patch(r.channel, { rangeMin: v ?? 0 })}
            />
            ~
            <InputNumber
              size="small"
              className="w-20"
              value={r.cfg.rangeMax ?? 0}
              onChange={(v) => patch(r.channel, { rangeMax: v ?? 0 })}
            />
          </Space>
        ),
    },
    {
      title: <Tooltip title="物理值 = 原始值 × 分辨率，并按分辨率舍入">分辨率</Tooltip>,
      width: 100,
      render: (_, r) =>
        r.cfg && (
          <Select
            size="small"
            className="w-20"
            value={r.cfg.resolution ?? 0}
            options={RESOLUTION_OPTIONS}
            onChange={(v) => patch(r.channel, { resolution: (v || undefined) as SensorBody['resolution'] })}
          />
        ),
    },
    {
      title: '校准',
      width: 110,
      render: (_, r) =>
        r.cfg && (
          <Button size="small" type="link" className="px-0" onClick={() => setCorrecting(r.channel)}>
            {calibrationSummary(r.cfg) === '—' ? '设置' : calibrationSummary(r.cfg)}
          </Button>
        ),
    },
    {
      title: '告警规则',
      width: 110,
      render: (_, r) => {
        if (!r.cfg) return null
        const rules = r.cfg.rules
        const on = rules.filter((x) => x.enabled).length
        const open = expanded.includes(r.channel)
        return (
          <Button
            size="small"
            type="link"
            className="px-0"
            icon={open ? <DownOutlined /> : <RightOutlined />}
            onClick={() => setExpanded(open ? expanded.filter((c) => c !== r.channel) : [...expanded, r.channel])}
          >
            {rules.length ? (
              <span>
                {rules.length} 条{on < rules.length && <span className="text-fg-tertiary"> ({on} 启用)</span>}
              </span>
            ) : (
              '添加'
            )}
          </Button>
        )
      },
    },
    {
      title: '操作',
      width: 120,
      fixed: 'right',
      render: (_, r) =>
        r.cfg ? (
          <Space size={0}>
            <Dropdown
              trigger={['click']}
              disabled={free.length === 0}
              menu={{
                items: free.slice(0, 200).map((c) => ({ key: c, label: `复制到 CH ${String(c).padStart(2, '0')}` })),
                style: { maxHeight: 280, overflow: 'auto' },
                onClick: ({ key }) => r.cfg && add(copyChannel(r.cfg, Number(key))),
              }}
            >
              <Tooltip title="复制到其他通道 (告警规则作为新规则，联动不复制)">
                <Button type="text" size="small" icon={<CopyOutlined />} />
              </Tooltip>
            </Dropdown>
            <Tooltip title="清空该通道配置">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => clear(r.channel)} />
            </Tooltip>
          </Space>
        ) : (
          <Button size="small" icon={<PlusOutlined />} onClick={() => add({ channel: r.channel, rules: [] })}>
            配置
          </Button>
        ),
    },
  ]

  const editing = correcting != null ? byChannel.get(correcting) : undefined

  return (
    <div className="layout-fill">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span>
          已配置 <b>{list.length}</b> / {maxChannels} 个通道
        </span>
        <Space size={6}>
          <Switch size="small" checked={showEmpty} onChange={setShowEmpty} />
          <span className="text-fg-secondary">显示未配置通道</span>
        </Space>
        {!showEmpty && free.length > 0 && (
          <Button size="small" icon={<PlusOutlined />} onClick={() => add({ channel: free[0], rules: [] })}>
            配置下一个空闲通道 (CH {free[0]})
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {dirty && <Badge status="warning" text="有未保存的修改" />}
          <Button icon={<UndoOutlined />} disabled={!dirty || saving} onClick={() => setList(original)}>
            撤销修改
          </Button>
          <Button type="primary" loading={saving} disabled={!dirty} onClick={save}>
            保存传感器配置
          </Button>
        </div>
      </div>
      {errors.length > 0 && (
        <Alert
          className="mb-3"
          type="error"
          showIcon
          closable
          onClose={() => setErrors([])}
          title={`有 ${errors.length} 处配置需要修改`}
          description={
            <ul className="m-0 pl-4">
              {errors.slice(0, 10).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          }
        />
      )}
      <Table<Row>
        size="small"
        rowKey="channel"
        columns={columns}
        dataSource={rows}
        pagination={rows.length > 64 ? { pageSize: 64, showSizeChanger: false } : false}
        rootClassName="layout-fill"
        scroll={{ x: 'max-content', y: 400 }}
        rowClassName={(r) => (r.cfg ? '' : 'opacity-70')}
        expandable={{
          expandedRowKeys: expanded,
          showExpandColumn: false,
          rowExpandable: (r) => Boolean(r.cfg),
          expandedRowRender: (r) =>
            r.cfg && (
              <AlertRulesEditor
                rules={r.cfg.rules}
                unit={r.cfg.unit}
                onChange={(rules) => patch(r.channel, { rules })}
              />
            ),
        }}
      />
      <div className="mt-2 text-fg-tertiary text-xs">
        <Tag className="mr-1">提示</Tag>
        设备配置在所有授权企业间共享；保存后立即生效。删除通道或规则时，规则的联动动作一起删除。
      </div>
      <CalibrationModal
        open={correcting != null}
        value={editing}
        onCancel={() => setCorrecting(null)}
        onOk={({ calibration, simulation }) => {
          if (correcting != null) patch(correcting, { calibration, simulation })
          setCorrecting(null)
        }}
      />
    </div>
  )
}
