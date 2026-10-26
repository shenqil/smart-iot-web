import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Modal, Select, Table, Tag, Tooltip } from 'antd'
import { useEffect, useState } from 'react'
import { channelName } from '@/features/telemetry/lib/realtime'
import {
  type DeviceConfigApi,
  type DeviceOption,
  deviceDetailKey,
  linkagesKey,
  type RelayAction,
  type RelayConfig,
  type SensorAlertConfig,
} from './api'

/** 每条告警规则最多的联动动作数 (与后端 entity.MaxRelayActions 一致) */
export const MAX_RELAY_ACTIONS = 16

/** 联动编辑所需的上下文：设备配置接口 (平台 / 企业) 与本设备 SN */
export interface LinkageContext {
  cfg: DeviceConfigApi
  deviceSn: string
}

type Row = {
  key: string
  targetSn: string
  relayIndex?: number
  state: 0 | 1
  /** 已保存的动作：被控设备与通道不可改 (要换就删掉重加) */
  existing: boolean
  targetName?: string
  relays?: RelayConfig[]
}

let seq = 0
const rowKey = () => `r${++seq}`
const STATE_OPTIONS = [
  { value: 1, label: '开启' },
  { value: 0, label: '关闭' },
]

/** 本设备 SN 的联动总览 (被控设备名称、继电器名称、是否失效)，按 规则编码|被控 SN|通道 索引 */
export function useLinkageInfo(ctx: LinkageContext | undefined) {
  const { data } = useQuery({
    queryKey: ctx ? linkagesKey(ctx.cfg, ctx.deviceSn) : ['linkages', 'none'],
    queryFn: () => (ctx ? ctx.cfg.linkages(ctx.deviceSn) : Promise.resolve([])),
    enabled: Boolean(ctx),
    staleTime: 30_000,
  })
  const map = new Map(
    (data ?? [])
      .filter((v) => v.sourceDeviceSn === ctx?.deviceSn)
      .map((v) => [`${v.alertCode}|${v.targetDeviceSn}|${v.relayIndex}`, v]),
  )
  return (code: string | undefined, a: Pick<RelayAction, 'targetSn'> & { relayIndex?: number }) =>
    map.get(`${code}|${a.targetSn}|${a.relayIndex}`)
}

/**
 * 告警规则的联动动作编辑 (docs/AUTOMATION_CONTROL.md §2)：规则推送告警时，对每个动作开 / 关一路继电器。
 * 结果写回规则 (草稿)，随传感器配置一起保存；与规则一样在设备重连后生效。
 */
export function RelayActionsModal({
  ctx,
  rule,
  open,
  onOk,
  onCancel,
}: {
  ctx: LinkageContext
  rule: SensorAlertConfig
  open: boolean
  onOk: (actions: RelayAction[]) => void
  onCancel: () => void
}) {
  const qc = useQueryClient()
  const info = useLinkageInfo(ctx)
  const [rows, setRows] = useState<Row[]>([])
  const [keyword, setKeyword] = useState('')
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!open) return
    setError(undefined)
    setKeyword('')
    setRows(
      (rule.actions ?? []).map((a) => ({
        key: rowKey(),
        targetSn: a.targetSn,
        relayIndex: a.relayIndex,
        state: a.state ? 1 : 0,
        existing: true,
      })),
    )
  }, [open, rule])

  const search = useQuery({
    queryKey: [...ctx.cfg.keyPrefix, 'relay-target-search', keyword],
    queryFn: () => ctx.cfg.searchDevices(keyword),
    enabled: open,
    staleTime: 30_000,
  })
  const options = search.data ?? []

  const patch = (key: string, p: Partial<Row>) => setRows((l) => l.map((r) => (r.key === key ? { ...r, ...p } : r)))

  const pickDevice = async (key: string, d: DeviceOption | undefined) => {
    if (!d) return patch(key, { targetSn: '', targetName: undefined, relays: undefined, relayIndex: undefined })
    patch(key, { targetSn: d.deviceSn, targetName: d.name, relays: undefined, relayIndex: undefined })
    const detail = await qc.fetchQuery({
      queryKey: deviceDetailKey(ctx.cfg, d.id),
      queryFn: () => ctx.cfg.detail(d.id),
    })
    patch(key, { relays: [...detail.relays].sort((a, b) => a.channelNum - b.channelNum) })
  }

  const submit = () => {
    const seen = new Set<string>()
    for (const [i, r] of rows.entries()) {
      if (!r.targetSn || r.relayIndex == null) return setError(`第 ${i + 1} 行：请选择被控设备与继电器通道`)
      const k = `${r.targetSn}|${r.relayIndex}`
      if (seen.has(k)) return setError(`第 ${i + 1} 行：同一路继电器只能配置一个动作`)
      seen.add(k)
    }
    onOk(rows.map((r) => ({ targetSn: r.targetSn, relayIndex: r.relayIndex as number, state: r.state })))
  }

  return (
    <Modal
      title="联动动作"
      open={open}
      width={760}
      okText="确定"
      cancelText="取消"
      onOk={submit}
      onCancel={onCancel}
      destroyOnHidden
    >
      <div className="mb-3 text-fg-secondary text-sm">
        该规则推送告警时 (频率随推送间隔)，依次对下列继电器执行开 /
        关；已是目标状态的跳过。动作随传感器配置一起保存，设备重连后生效。
      </div>
      {error && <Alert type="error" showIcon className="mb-3" message={error} />}
      <Table<Row>
        size="small"
        pagination={false}
        rowKey="key"
        dataSource={rows}
        locale={{ emptyText: '暂无联动动作' }}
        columns={[
          {
            title: '被控设备',
            render: (_, r) => {
              if (r.existing) {
                const v = info(rule.code, r)
                return v && v.targetDeviceId == null ? (
                  <span>
                    <span className="font-mono">{r.targetSn}</span>
                    <Tag color="error" className="ml-1">
                      设备不存在
                    </Tag>
                  </span>
                ) : (
                  <span>
                    {v?.targetDeviceName || '—'}
                    <span className="ml-1 font-mono text-fg-tertiary text-xs">{r.targetSn}</span>
                  </span>
                )
              }
              return (
                <Select
                  showSearch
                  allowClear
                  className="w-64"
                  placeholder="搜索设备 SN / 名称"
                  filterOption={false}
                  loading={search.isFetching}
                  value={r.targetSn || undefined}
                  onSearch={setKeyword}
                  onChange={(sn) =>
                    pickDevice(
                      r.key,
                      options.find((o) => o.deviceSn === sn),
                    )
                  }
                  options={options.map((o) => ({ value: o.deviceSn, label: `${o.name} (${o.deviceSn})` }))}
                  notFoundContent={search.isFetching ? '搜索中…' : '没有匹配的设备'}
                />
              )
            },
          },
          {
            title: '继电器通道',
            width: 200,
            render: (_, r) => {
              if (r.existing) {
                const v = info(rule.code, r)
                return (
                  <span>
                    {v?.relayName || `通道 ${r.relayIndex}`}
                    {v?.relayName && <span className="ml-1 text-fg-tertiary text-xs">通道 {r.relayIndex}</span>}
                    {v && !v.relayConfigured && v.targetDeviceId != null && (
                      <Tag color="error" className="ml-1">
                        未配置
                      </Tag>
                    )}
                  </span>
                )
              }
              return (
                <Select
                  className="w-44"
                  placeholder={r.targetSn ? (r.relays ? '选择通道' : '加载中…') : '先选择设备'}
                  disabled={!r.relays}
                  value={r.relayIndex}
                  onChange={(relayIndex) => patch(r.key, { relayIndex })}
                  options={(r.relays ?? []).map((x) => ({
                    value: x.channelNum,
                    label: `${channelName(x)} (通道 ${x.channelNum})`,
                  }))}
                  notFoundContent="该设备未配置继电器"
                />
              )
            },
          },
          {
            title: '动作',
            width: 100,
            render: (_, r) => (
              <Select
                className="w-20"
                value={r.state}
                options={STATE_OPTIONS}
                onChange={(state) => patch(r.key, { state: state as 0 | 1 })}
              />
            ),
          },
          {
            title: '',
            width: 48,
            render: (_, r) => (
              <Tooltip title="删除">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setRows((l) => l.filter((x) => x.key !== r.key))}
                />
              </Tooltip>
            ),
          },
        ]}
      />
      <Button
        type="dashed"
        size="small"
        icon={<PlusOutlined />}
        className="mt-2"
        disabled={rows.length >= MAX_RELAY_ACTIONS}
        onClick={() => setRows((l) => [...l, { key: rowKey(), targetSn: '', state: 1, existing: false }])}
      >
        添加动作 ({rows.length}/{MAX_RELAY_ACTIONS})
      </Button>
    </Modal>
  )
}
