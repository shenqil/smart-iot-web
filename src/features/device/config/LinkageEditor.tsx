import { ArrowRightOutlined, SettingOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Table, Tag, Tooltip, Typography } from 'antd'
import { useState } from 'react'
import { Link } from 'react-router'
import { linkageActionText } from '@/features/relay/linkage'
import { type DeviceConfigApi, type LinkageRule, linkageKeys, type RelayLinkage } from './api'
import { RelayActionsModal } from './RelayActionsModal'
import { ALERT_LEVELS } from './sensorRules'

const LevelTag = ({ level }: { level: number }) => {
  const l = ALERT_LEVELS.find((x) => x.value === level)
  return l ? (
    <Tag color={l.color} className="m-0">
      {l.label}
    </Tag>
  ) : null
}

const StateTag = ({ state }: { state: number }) => (
  <Tag color={state ? 'green' : 'default'} className="m-0">
    {linkageActionText(state)}
  </Tag>
)

/**
 * 告警联动 (平台与企业共用，docs/AUTOMATION_CONTROL.md)：
 * - 本设备的告警规则 → 联动动作 (可控制本设备或其他设备的继电器)，在这里编辑，保存后立即生效
 * - 控制本设备继电器的规则 (含其他设备的规则)，只读，可跳转到触发设备编辑
 * 规则本身在「传感器配置」中维护
 */
export function LinkageEditor({ cfg, deviceId }: { cfg: DeviceConfigApi; deviceId: number }) {
  const rules = useQuery({ queryKey: linkageKeys.rules(cfg, deviceId), queryFn: () => cfg.alertRules(deviceId) })
  const incoming = useQuery({
    queryKey: linkageKeys.relays(cfg, deviceId),
    queryFn: () => cfg.relayLinkages(deviceId),
  })
  const [editing, setEditing] = useState<LinkageRule | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <Alert
        type="info"
        showIcon
        icon={<ThunderboltOutlined />}
        message="告警规则每次触发与重复推送时，自动开 / 关配置的继电器 (本设备或其他设备)；手动接管中的继电器跳过。规则在「传感器配置」中维护，联动在这里配置，保存后立即生效。"
      />
      <div>
        <Typography.Title level={5} className="!mb-2">
          本设备的告警规则
        </Typography.Title>
        <Table<LinkageRule>
          size="small"
          rowKey="id"
          loading={rules.isPending}
          dataSource={rules.data ?? []}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: '还没有告警规则，请先在「传感器配置」中为通道添加规则' }}
          rowClassName={(r) => (r.enabled ? '' : 'opacity-70')}
          columns={[
            {
              title: '传感器',
              width: 160,
              render: (_, r) => (
                <span>
                  {r.sensorLabel}
                  <span className="ml-1 text-fg-tertiary text-xs">通道 {r.channel}</span>
                </span>
              ),
            },
            {
              title: '规则',
              width: 260,
              render: (_, r) => (
                <div className="flex flex-wrap items-center gap-1">
                  <span>{r.description}</span>
                  <LevelTag level={r.level} />
                  {!r.createAlarm && (
                    <Tooltip title="不生成告警记录，只执行联动">
                      <Tag className="m-0">仅联动</Tag>
                    </Tooltip>
                  )}
                  {!r.enabled && <Tag className="m-0">已停用</Tag>}
                </div>
              ),
            },
            {
              title: '联动动作',
              render: (_, r) =>
                r.actions.length ? (
                  <div className="flex flex-col gap-1">
                    {r.actions.map((a) => (
                      <span key={`${a.deviceId}-${a.channel}`} className="whitespace-nowrap">
                        <StateTag state={a.state} /> {a.deviceId === deviceId ? '本设备' : a.deviceName || a.deviceSn} ·{' '}
                        {a.relayLabel}
                        <span className="ml-1 text-fg-tertiary text-xs">通道 {a.channel}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-fg-tertiary">—</span>
                ),
            },
            {
              title: '',
              width: 110,
              fixed: 'right',
              render: (_, r) => (
                <Button type="link" size="small" icon={<SettingOutlined />} onClick={() => setEditing(r)}>
                  编辑联动
                </Button>
              ),
            },
          ]}
        />
      </div>
      <div>
        <Typography.Title level={5} className="!mb-2">
          控制本设备继电器的规则
        </Typography.Title>
        <Table<RelayLinkage>
          size="small"
          rowKey={(r) => `${r.ruleId}-${r.channel}`}
          loading={incoming.isPending}
          dataSource={incoming.data ?? []}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: '没有规则控制本设备的继电器' }}
          rowClassName={(r) => (r.ruleEnabled ? '' : 'opacity-70')}
          columns={[
            {
              title: '继电器',
              width: 180,
              render: (_, r) => (
                <span>
                  {r.relayLabel}
                  <span className="ml-1 text-fg-tertiary text-xs">通道 {r.channel}</span>
                </span>
              ),
            },
            { title: '动作', width: 80, render: (_, r) => <StateTag state={r.state} /> },
            {
              title: '触发设备',
              width: 200,
              render: (_, r) =>
                r.sourceDeviceId === deviceId ? (
                  '本设备'
                ) : (
                  <div>
                    <div>{r.sourceDeviceName}</div>
                    <div className="font-mono text-fg-tertiary text-xs">{r.sourceDeviceSn}</div>
                  </div>
                ),
            },
            {
              title: '规则',
              render: (_, r) => (
                <span>
                  {r.description}
                  {!r.ruleEnabled && <Tag className="ml-1">已停用</Tag>}
                </span>
              ),
            },
            {
              title: '',
              width: 110,
              fixed: 'right',
              render: (_, r) =>
                r.sourceDeviceId === deviceId ? null : (
                  <Link to={`${cfg.deviceHref(r.sourceDeviceId)}?tab=linkage`}>
                    触发设备 <ArrowRightOutlined />
                  </Link>
                ),
            },
          ]}
        />
      </div>
      {editing && <RelayActionsModal cfg={cfg} rule={editing} open onClose={() => setEditing(null)} />}
    </div>
  )
}
