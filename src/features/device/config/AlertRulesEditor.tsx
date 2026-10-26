import { CopyOutlined, DeleteOutlined, PlusOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { App, Button, InputNumber, Select, Space, Switch, Table, Tag, Tooltip } from 'antd'
import { useState } from 'react'
import type { SensorAlertConfig } from './api'
import { type LinkageContext, RelayActionsModal, useLinkageInfo } from './RelayActionsModal'
import { ALERT_LEVELS, ALERT_TYPES, cloneRule, newRule } from './sensorRules'

/** 某通道的告警规则子表：启用、类型、级别、阈值 / 区间、推送间隔、联动动作 (提供 linkage 时) */
export function AlertRulesEditor({
  rules,
  unit,
  onChange,
  linkage,
}: {
  rules: SensorAlertConfig[]
  unit?: string
  onChange: (rules: SensorAlertConfig[]) => void
  linkage?: LinkageContext
}) {
  const { modal } = App.useApp()
  const info = useLinkageInfo(linkage)
  const [editing, setEditing] = useState<number | null>(null)
  const patch = (i: number, p: Partial<SensorAlertConfig>) =>
    onChange(rules.map((r, j) => (j === i ? { ...r, ...p } : r)))
  /** 删除规则：有联动动作时确认 (动作随规则一起删除) */
  const remove = (i: number) => {
    const n = rules[i].actions?.length ?? 0
    if (!n) return onChange(rules.filter((_, j) => j !== i))
    modal.confirm({
      title: '删除告警规则？',
      content: `该规则有 ${n} 个联动动作，将随规则一起删除 (保存传感器配置后生效)。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => onChange(rules.filter((_, j) => j !== i)),
    })
  }
  const u = unit ? <span className="text-fg-tertiary text-xs">{unit}</span> : null

  return (
    <div className="rounded-md bg-layout p-3">
      <Table<SensorAlertConfig>
        size="small"
        pagination={false}
        rowKey={(r) => r.code as string}
        dataSource={rules}
        locale={{ emptyText: '暂无告警规则' }}
        columns={[
          {
            title: '启用',
            width: 64,
            render: (_, r, i) => (
              <Switch size="small" checked={r.enabled} onChange={(enabled) => patch(i, { enabled })} />
            ),
          },
          {
            title: '条件',
            width: 110,
            render: (_, r, i) => (
              <Select
                size="small"
                className="w-24"
                value={r.alertType}
                options={[...ALERT_TYPES]}
                onChange={(alertType) => patch(i, { alertType })}
              />
            ),
          },
          {
            title: '阈值',
            width: 260,
            render: (_, r, i) =>
              r.alertType === 'range' ? (
                <Space size={4}>
                  <InputNumber
                    size="small"
                    className="w-24"
                    value={r.minValue ?? 0}
                    onChange={(v) => patch(i, { minValue: v ?? 0 })}
                  />
                  ~
                  <InputNumber
                    size="small"
                    className="w-24"
                    value={r.maxValue ?? 0}
                    onChange={(v) => patch(i, { maxValue: v ?? 0 })}
                  />
                  {u}
                </Space>
              ) : (
                <Space size={4}>
                  <InputNumber
                    size="small"
                    className="w-28"
                    value={r.threshold ?? 0}
                    onChange={(v) => patch(i, { threshold: v ?? 0 })}
                  />
                  {u}
                </Space>
              ),
          },
          {
            title: '级别',
            width: 100,
            render: (_, r, i) => (
              <Select
                size="small"
                className="w-20"
                value={r.level || 3}
                options={ALERT_LEVELS.map((l) => ({ value: l.value, label: l.label }))}
                onChange={(level) => patch(i, { level })}
              />
            ),
          },
          {
            title: <Tooltip title="条件持续成立时，距上次推送满此间隔才再推送">推送间隔 (秒)</Tooltip>,
            width: 130,
            render: (_, r, i) => (
              <InputNumber
                size="small"
                className="w-24"
                min={1}
                precision={0}
                value={r.repeatInterval}
                onChange={(v) => patch(i, { repeatInterval: v ?? 0 })}
              />
            ),
          },
          ...(linkage
            ? [
                {
                  title: <Tooltip title="规则推送告警时自动开 / 关继电器 (本设备或其他设备)">联动</Tooltip>,
                  width: 110,
                  render: (_: unknown, r: SensorAlertConfig, i: number) => {
                    const acts = r.actions ?? []
                    const broken = acts.filter((a) => info(r.code, a)?.relayConfigured === false).length
                    return (
                      <Space size={4}>
                        <Button
                          type="link"
                          size="small"
                          className="px-0"
                          icon={<ThunderboltOutlined />}
                          onClick={() => setEditing(i)}
                        >
                          {acts.length ? `${acts.length} 个` : '添加'}
                        </Button>
                        {broken > 0 && (
                          <Tooltip title="被控设备已删除或继电器通道未配置，执行时会失败">
                            <Tag color="error" className="m-0">
                              失效 {broken}
                            </Tag>
                          </Tooltip>
                        )}
                      </Space>
                    )
                  },
                },
              ]
            : []),
          {
            title: '',
            width: 80,
            render: (_, r, i) => (
              <Space size={0}>
                <Tooltip title="复制规则">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => onChange([...rules.slice(0, i + 1), cloneRule(r), ...rules.slice(i + 1)])}
                  />
                </Tooltip>
                <Tooltip title="删除规则">
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => remove(i)} />
                </Tooltip>
              </Space>
            ),
          },
        ]}
      />
      <Button
        type="dashed"
        size="small"
        icon={<PlusOutlined />}
        className="mt-2"
        onClick={() => onChange([...rules, newRule()])}
      >
        添加规则
      </Button>
      {linkage && editing != null && rules[editing] && (
        <RelayActionsModal
          ctx={linkage}
          rule={rules[editing]}
          open
          onCancel={() => setEditing(null)}
          onOk={(actions) => {
            patch(editing, { actions })
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
