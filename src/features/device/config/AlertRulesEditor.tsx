import { CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, InputNumber, Select, Space, Switch, Table, Tooltip } from 'antd'
import type { SensorAlertConfig } from './api'
import { ALERT_LEVELS, ALERT_TYPES, cloneRule, newRule } from './sensorRules'

/** 某通道的告警规则子表：启用、类型、级别、阈值 / 区间、推送间隔 */
export function AlertRulesEditor({
  rules,
  unit,
  onChange,
}: {
  rules: SensorAlertConfig[]
  unit?: string
  onChange: (rules: SensorAlertConfig[]) => void
}) {
  const patch = (i: number, p: Partial<SensorAlertConfig>) =>
    onChange(rules.map((r, j) => (j === i ? { ...r, ...p } : r)))
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
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onChange(rules.filter((_, j) => j !== i))}
                  />
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
    </div>
  )
}
