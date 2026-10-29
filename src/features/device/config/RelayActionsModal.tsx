import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Modal, Select, Table, Tooltip } from 'antd'
import { useEffect, useState } from 'react'
import { isApiError } from '@/api/errors'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'
import {
  type DeviceConfigApi,
  type DeviceOption,
  deviceDetailKey,
  type LinkageRule,
  linkageKeys,
  type RelayView,
} from './api'

/** 每条告警规则最多的联动动作数 (与后端一致) */
export const MAX_RELAY_ACTIONS = 16

type Row = {
  key: string
  deviceId?: number
  deviceName?: string
  deviceSn?: string
  channel?: number
  relayLabel?: string
  state: 0 | 1
  /** 已保存的动作：被控设备与通道不可改 (要换就删掉重加) */
  existing: boolean
  relays?: RelayView[]
}

let seq = 0
const rowKey = () => `a${++seq}`
const STATE_OPTIONS = [
  { value: 1, label: '开启' },
  { value: 0, label: '关闭' },
]

/**
 * 告警规则的联动动作 (docs/AUTOMATION_CONTROL.md §2)：规则每次触发与重复推送时，对每个动作开 / 关一路继电器
 * (本设备或其他设备；手动接管中的继电器跳过)。整体替换，保存后立即生效。
 */
export function RelayActionsModal({
  cfg,
  rule,
  open,
  onClose,
}: {
  cfg: DeviceConfigApi
  rule: LinkageRule
  open: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [rows, setRows] = useState<Row[]>([])
  const [keyword, setKeyword] = useState('')
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!open) return
    setError(undefined)
    setKeyword('')
    setRows(
      rule.actions.map((a) => ({
        key: rowKey(),
        deviceId: a.deviceId,
        deviceName: a.deviceName,
        deviceSn: a.deviceSn,
        channel: a.channel,
        relayLabel: a.relayLabel,
        state: a.state ? 1 : 0,
        existing: true,
      })),
    )
  }, [open, rule])

  const search = useQuery({
    queryKey: [...cfg.keyPrefix, 'relay-target-search', keyword],
    queryFn: () => cfg.searchDevices(keyword),
    enabled: open,
    staleTime: 30_000,
  })
  const options = search.data ?? []

  const patch = (key: string, p: Partial<Row>) => setRows((l) => l.map((r) => (r.key === key ? { ...r, ...p } : r)))

  const pickDevice = async (key: string, d: DeviceOption | undefined) => {
    patch(key, { deviceId: d?.id, deviceName: d?.name, deviceSn: d?.deviceSn, relays: undefined, channel: undefined })
    if (!d) return
    try {
      const detail = await qc.fetchQuery({ queryKey: deviceDetailKey(cfg, d.id), queryFn: () => cfg.detail(d.id) })
      patch(key, { relays: [...detail.relays].sort((a, b) => a.channel - b.channel) })
    } catch (e) {
      handleGlobalError(e)
    }
  }

  const save = useMutation({
    mutationFn: () =>
      cfg.setActions(
        rule.id,
        rows.map((r) => ({ deviceId: r.deviceId as number, channel: r.channel as number, state: r.state })),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: linkageKeys.all(cfg) })
      // 传感器配置页的规则联动数
      qc.invalidateQueries({ queryKey: [...cfg.keyPrefix, 'detail'] })
      notify.success('联动已保存，立即生效')
      onClose()
    },
    onError: (e) => {
      if (isApiError(e) && e.code === 'LINKAGE_ACTION_INVALID') {
        const lines = e.details.map((d) => {
          const i = Number(/\[(\d+)\]/.exec(d.location ?? '')?.[1])
          return Number.isNaN(i) ? d.message : `第 ${i + 1} 行：${d.message}`
        })
        setError(lines.join('；') || e.message)
      } else handleGlobalError(e)
    },
  })

  const submit = () => {
    const seen = new Set<string>()
    for (const [i, r] of rows.entries()) {
      if (r.deviceId == null || r.channel == null) return setError(`第 ${i + 1} 行：请选择被控设备与继电器通道`)
      const k = `${r.deviceId}|${r.channel}`
      if (seen.has(k)) return setError(`第 ${i + 1} 行：同一路继电器只能配置一个动作`)
      seen.add(k)
    }
    setError(undefined)
    save.mutate()
  }

  return (
    <Modal
      title={`联动动作 · ${rule.sensorLabel} ${rule.description}`}
      open={open}
      width={760}
      okText="保存"
      cancelText="取消"
      confirmLoading={save.isPending}
      onOk={submit}
      onCancel={onClose}
      destroyOnHidden
    >
      <div className="mb-3 text-fg-secondary text-sm">
        规则每次触发与重复推送时，依次对下列继电器执行开 / 关 (已是目标状态的跳过，手动接管中的跳过)；条件解除时不执行。
        需要滞回控制时配置两条规则，例如 &gt; 35 开风机、&lt; 34 关风机。保存后立即生效。
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
            render: (_, r) =>
              r.existing ? (
                <span>
                  {r.deviceName || '—'}
                  <span className="ml-1 font-mono text-fg-tertiary text-xs">{r.deviceSn}</span>
                </span>
              ) : (
                <Select
                  showSearch
                  allowClear
                  className="w-64"
                  placeholder="搜索设备 SN / 名称"
                  filterOption={false}
                  loading={search.isFetching}
                  value={r.deviceId}
                  onSearch={setKeyword}
                  onChange={(id) =>
                    pickDevice(
                      r.key,
                      options.find((o) => o.id === id),
                    )
                  }
                  options={options.map((o) => ({ value: o.id, label: `${o.name} (${o.deviceSn})` }))}
                  notFoundContent={search.isFetching ? '搜索中…' : '没有匹配的设备'}
                />
              ),
          },
          {
            title: '继电器通道',
            width: 200,
            render: (_, r) =>
              r.existing ? (
                <span>
                  {r.relayLabel}
                  <span className="ml-1 text-fg-tertiary text-xs">通道 {r.channel}</span>
                </span>
              ) : (
                <Select
                  className="w-44"
                  placeholder={r.deviceId != null ? (r.relays ? '选择通道' : '加载中…') : '先选择设备'}
                  disabled={!r.relays}
                  value={r.channel}
                  onChange={(channel) => patch(r.key, { channel })}
                  options={(r.relays ?? []).map((x) => ({ value: x.channel, label: `${x.label} (通道 ${x.channel})` }))}
                  notFoundContent="该设备未配置继电器"
                />
              ),
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
        onClick={() => setRows((l) => [...l, { key: rowKey(), state: 1, existing: false }])}
      >
        添加动作 ({rows.length}/{MAX_RELAY_ACTIONS})
      </Button>
    </Modal>
  )
}
