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
import { uuid } from '@/utils/uuid'
import { AlertRulesEditor } from './AlertRulesEditor'
import type { SensorConfig } from './api'
import { CorrectionModal } from './CorrectionModal'
import { copyChannel, correctionSummary, prepareSensors, validateSensors } from './sensorRules'

type Row = { channelNum: number; cfg?: SensorConfig }

/** 载入时给缺编码的规则补编码 (作为行 key，保存时也需要) */
const normalize = (list: SensorConfig[]) =>
  list.map((s) => ({ ...s, alertConfigs: (s.alertConfigs ?? []).map((r) => (r.code ? r : { ...r, code: uuid() })) }))

/**
 * 传感器配置编辑器 (FRONTEND_DESIGN §3.5，平台与企业共用)
 * 行 = 通道号 0 ~ maxSensorChannels-1；未配置的通道不提交；保存为整体替换
 */
export function SensorsEditor({
  sensors,
  maxChannels,
  saving,
  onSave,
  onDirtyChange,
}: {
  sensors: SensorConfig[]
  maxChannels: number
  saving: boolean
  onSave: (sensors: SensorConfig[]) => Promise<unknown>
  onDirtyChange?: (dirty: boolean) => void
}) {
  const std = useStandardSensors()
  const original = useMemo(() => normalize(sensors), [sensors])
  const [list, setList] = useState<SensorConfig[]>(original)
  const [expanded, setExpanded] = useState<number[]>([])
  const [showEmpty, setShowEmpty] = useState(maxChannels <= 64)
  const [correcting, setCorrecting] = useState<number | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => setList(original), [original])
  const dirty = JSON.stringify(list) !== JSON.stringify(original)
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange])

  const byChannel = new Map(list.map((s) => [s.channelNum, s]))
  const patch = (ch: number, p: Partial<SensorConfig>) =>
    setList((l) => l.map((s) => (s.channelNum === ch ? { ...s, ...p } : s)))
  const add = (cfg: SensorConfig) => setList((l) => [...l.filter((s) => s.channelNum !== cfg.channelNum), cfg])
  const clear = (ch: number) => setList((l) => l.filter((s) => s.channelNum !== ch))
  const free = Array.from({ length: maxChannels }, (_, i) => i).filter((i) => !byChannel.has(i))

  const rows: Row[] = showEmpty
    ? Array.from({ length: maxChannels }, (_, i) => ({ channelNum: i, cfg: byChannel.get(i) }))
    : [...list].sort((a, b) => a.channelNum - b.channelNum).map((s) => ({ channelNum: s.channelNum, cfg: s }))

  const applyStandard = (ch: number, id: number | undefined) => {
    const d = id != null ? std.byId.get(id) : undefined
    if (!d) return patch(ch, { standardId: undefined, standardName: undefined })
    patch(ch, {
      standardId: d.id,
      standardName: d.name,
      unit: d.unit || undefined,
      minValue: d.minValue,
      maxValue: d.maxValue,
      resolution: (d.resolution || undefined) as SensorConfig['resolution'],
      url: d.url || undefined,
    })
  }

  const save = async () => {
    const out = prepareSensors(list)
    const errs = validateSensors(out, maxChannels)
    setErrors(errs)
    if (errs.length) return
    await onSave(out)
  }

  const columns: ColumnsType<Row> = [
    {
      title: '通道',
      dataIndex: 'channelNum',
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
            value={r.cfg.standardId ?? undefined}
            options={std.list.map((s) => ({ value: s.id, label: s.name }))}
            onChange={(v) => applyStandard(r.channelNum, v)}
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
            value={r.cfg.displayName ?? ''}
            onChange={(e) => patch(r.channelNum, { displayName: e.target.value })}
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
            onChange={(e) => patch(r.channelNum, { unit: e.target.value })}
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
              value={r.cfg.minValue ?? 0}
              onChange={(v) => patch(r.channelNum, { minValue: v ?? 0 })}
            />
            ~
            <InputNumber
              size="small"
              className="w-20"
              value={r.cfg.maxValue ?? 0}
              onChange={(v) => patch(r.channelNum, { maxValue: v ?? 0 })}
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
            onChange={(v) => patch(r.channelNum, { resolution: (v || undefined) as SensorConfig['resolution'] })}
          />
        ),
    },
    {
      title: '校准',
      width: 110,
      render: (_, r) =>
        r.cfg && (
          <Button size="small" type="link" className="px-0" onClick={() => setCorrecting(r.channelNum)}>
            {correctionSummary(r.cfg) === '—' ? '设置' : correctionSummary(r.cfg)}
          </Button>
        ),
    },
    {
      title: '告警规则',
      width: 110,
      render: (_, r) => {
        if (!r.cfg) return null
        const rules = r.cfg.alertConfigs ?? []
        const on = rules.filter((x) => x.enabled).length
        const open = expanded.includes(r.channelNum)
        return (
          <Button
            size="small"
            type="link"
            className="px-0"
            icon={open ? <DownOutlined /> : <RightOutlined />}
            onClick={() => setExpanded(open ? expanded.filter((c) => c !== r.channelNum) : [...expanded, r.channelNum])}
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
              <Tooltip title="复制到其他通道 (告警规则生成新编码)">
                <Button type="text" size="small" icon={<CopyOutlined />} />
              </Tooltip>
            </Dropdown>
            <Tooltip title="清空该通道配置">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => clear(r.channelNum)} />
            </Tooltip>
          </Space>
        ) : (
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => add({ channelNum: r.channelNum, alertConfigs: [] })}
          >
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
          <Button size="small" icon={<PlusOutlined />} onClick={() => add({ channelNum: free[0], alertConfigs: [] })}>
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
        rowKey="channelNum"
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
                rules={r.cfg.alertConfigs ?? []}
                unit={r.cfg.unit}
                onChange={(alertConfigs) => patch(r.channelNum, { alertConfigs })}
              />
            ),
        }}
      />
      <div className="mt-2 text-fg-tertiary text-xs">
        <Tag className="mr-1">提示</Tag>
        设备配置在所有授权企业间共享；保存后设备重连时生效，可在页头"断开连接"立即生效。
      </div>
      <CorrectionModal
        open={correcting != null}
        value={editing?.correction}
        onCancel={() => setCorrecting(null)}
        onOk={(correction) => {
          if (correcting != null) patch(correcting, { correction })
          setCorrecting(null)
        }}
      />
    </div>
  )
}
