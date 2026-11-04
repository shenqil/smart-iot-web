import { CopyOutlined, DeleteOutlined, PlusOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { App, Button, InputNumber, Select, Space, Switch, Table, Tag, Tooltip } from 'antd'
import { ALERT_LEVELS, ALERT_TYPES, cloneRule, MAX_RULES, newRule, type RuleDraft } from './sensorRules'

/**
 * 某通道的告警规则子表：启用、条件、阈值 / 区间、级别、推送间隔、是否生成告警记录
 * 联动动作在「告警联动」页签中配置 (规则保存后才有 id)；这里只显示数量
 */
export function AlertRulesEditor({
  rules,
  unit,
  onChange,
}: {
  rules: RuleDraft[]
  unit?: string
  onChange: (rules: RuleDraft[]) => void
}) {
  const { modal } = App.useApp()
  const patch = (i: number, p: Partial<RuleDraft>) => onChange(rules.map((r, j) => (j === i ? { ...r, ...p } : r)))
  /** 删除规则：有联动动作时确认 (动作随规则一起删除) */
  const remove = (i: number) => {
    const n = rules[i].actionCount ?? 0
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
      <Table<RuleDraft>
        size="small"
        pagination={false}
        rowKey="key"
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
                value={r.condition}
                options={[...ALERT_TYPES]}
                onChange={(condition) => patch(i, { condition })}
              />
            ),
          },
          {
            title: '阈值',
            width: 260,
            render: (_, r, i) =>
              r.condition === 'between' ? (
                <Space size={4}>
                  <InputNumber
                    size="small"
                    className="w-24"
                    value={r.lower ?? 0}
                    onChange={(v) => patch(i, { lower: v ?? 0 })}
                  />
                  ~
                  <InputNumber
                    size="small"
                    className="w-24"
                    value={r.upper ?? 0}
                    onChange={(v) => patch(i, { upper: v ?? 0 })}
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
            title: <Tooltip title="条件持续成立时的重复推送间隔；每次推送都执行联动">推送间隔 (秒)</Tooltip>,
            width: 130,
            render: (_, r, i) => (
              <InputNumber
                size="small"
                className="w-24"
                min={1}
                max={86_400}
                precision={0}
                value={r.repeatSeconds}
                onChange={(v) => patch(i, { repeatSeconds: v ?? 0 })}
              />
            ),
          },
          {
            title: <Tooltip title="关闭后只执行联动、不生成告警记录 (例如 < 34 ℃ 关风机)">生成告警</Tooltip>,
            width: 90,
            render: (_, r, i) => (
              <Switch size="small" checked={r.createAlarm} onChange={(createAlarm) => patch(i, { createAlarm })} />
            ),
          },
          {
            title: <Tooltip title="在「告警联动」页签中配置">联动</Tooltip>,
            width: 80,
            render: (_, r) =>
              r.actionCount ? (
                <Tag color="blue" icon={<ThunderboltOutlined />} className="m-0">
                  {r.actionCount}
                </Tag>
              ) : (
                <span className="text-fg-tertiary">—</span>
              ),
          },
          {
            title: '',
            width: 80,
            render: (_, r, i) => (
              <Space size={0}>
                <Tooltip title="复制规则 (不复制联动)">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    disabled={rules.length >= MAX_RULES}
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
        disabled={rules.length >= MAX_RULES}
        onClick={() => onChange([...rules, newRule()])}
      >
        添加规则 ({rules.length}/{MAX_RULES})
      </Button>
    </div>
  )
}
