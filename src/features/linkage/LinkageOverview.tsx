import { SearchOutlined, SettingOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Empty, Input, Table, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { type DeviceConfigApi, linkagesKey, type RelayLinkage } from '@/features/device/config/api'
import { ALERT_LEVELS } from '@/features/device/config/sensorRules'
import { linkageCondText } from '@/features/relay/linkage'

/**
 * 联动总览 (只读，docs/AUTOMATION_CONTROL.md §9)：输入设备 SN，列出它作为触发设备 (它的告警规则控制了哪些继电器)
 * 与作为被控设备 (哪些规则在控制它的继电器) 的全部联动动作。联动动作在设备配置的告警规则中维护。
 * 平台管理端与企业管理端共用 (企业端只显示两边设备都属于本企业的行)。
 */
export function LinkageOverview({ cfg }: { cfg: DeviceConfigApi }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const sn = params.get('sn')?.trim() ?? ''
  const [input, setInput] = useState(sn)
  const { data, isFetching, error } = useQuery({
    queryKey: linkagesKey(cfg, sn),
    queryFn: () => cfg.linkages(sn),
    enabled: Boolean(sn),
  })
  const rows = data ?? []
  const search = () => {
    const v = input.trim()
    setParams(v ? { sn: v } : {}, { replace: true })
  }

  const columns: ColumnsType<RelayLinkage> = [
    {
      title: '关系',
      width: 80,
      render: (_, r) => (
        <>
          {r.sourceDeviceSn === sn && <Tag color="geekblue">触发</Tag>}
          {r.targetDeviceSn === sn && <Tag color="orange">被控</Tag>}
        </>
      ),
    },
    {
      title: '触发设备',
      render: (_, r) => (
        <div>
          <div>{r.sourceDeviceName}</div>
          <div className="font-mono text-fg-tertiary text-xs">{r.sourceDeviceSn}</div>
        </div>
      ),
    },
    {
      title: '告警规则',
      render: (_, r) => {
        const level = ALERT_LEVELS.find((l) => l.value === r.level)
        return (
          <div>
            <div>
              {r.channelName || `通道 ${r.channelNum}`}
              <span className="ml-1 text-fg-tertiary text-xs">通道 {r.channelNum}</span>
            </div>
            <div className="text-xs">
              {linkageCondText(r)}
              {level && (
                <Tag color={level.color} className="ml-1">
                  {level.label}
                </Tag>
              )}
              {!r.enabled && <Tag className="ml-1">已停用</Tag>}
            </div>
          </div>
        )
      },
    },
    {
      title: '被控设备',
      render: (_, r) =>
        r.targetDeviceId == null ? (
          <div>
            <Tag color="error">设备不存在</Tag>
            <div className="font-mono text-fg-tertiary text-xs">{r.targetDeviceSn}</div>
          </div>
        ) : (
          <div>
            <div>{r.targetDeviceName}</div>
            <div className="font-mono text-fg-tertiary text-xs">{r.targetDeviceSn}</div>
          </div>
        ),
    },
    {
      title: '继电器',
      render: (_, r) => (
        <span className="whitespace-nowrap">
          {r.relayName || `通道 ${r.relayIndex}`}
          {r.relayName && <span className="ml-1 text-fg-tertiary text-xs">通道 {r.relayIndex}</span>}
          {!r.relayConfigured && r.targetDeviceId != null && (
            <Tooltip title="被控设备未配置该继电器通道，执行时会失败">
              <Tag color="error" className="ml-1">
                未配置
              </Tag>
            </Tooltip>
          )}
        </span>
      ),
    },
    {
      title: '动作',
      dataIndex: 'state',
      width: 72,
      render: (v: number) => <Tag color={v ? 'green' : 'default'}>{v ? '开启' : '关闭'}</Tag>,
    },
    {
      title: '',
      width: 100,
      render: (_, r) => (
        <Button
          type="link"
          size="small"
          icon={<SettingOutlined />}
          onClick={() => navigate(`${cfg.deviceHref(r.sourceDeviceId)}?tab=sensors`)}
        >
          编辑规则
        </Button>
      ),
    },
  ]

  return (
    <div className="layout-fill">
      <Alert
        type="info"
        showIcon
        icon={<ThunderboltOutlined />}
        className="mb-3"
        message="告警规则推送告警时，自动开 / 关规则上配置的继电器 (本设备或其他设备)。联动动作在设备配置 · 传感器配置的告警规则中维护，与规则一样在设备重连后生效。"
      />
      <div className="mb-3 flex items-center gap-2">
        <Input
          allowClear
          className="w-72"
          prefix={<SearchOutlined className="text-fg-tertiary" />}
          placeholder="输入设备 SN (精确匹配)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={search}
        />
        <Button type="primary" onClick={search}>
          查询
        </Button>
        {sn && !isFetching && !error && <span className="text-fg-tertiary text-sm">共 {rows.length} 个联动动作</span>}
      </div>
      <Table<RelayLinkage>
        rootClassName="layout-fill"
        size="middle"
        rowKey={(r) => `${r.sourceDeviceSn}|${r.alertCode}|${r.targetDeviceSn}|${r.relayIndex}`}
        loading={isFetching}
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 'max-content' }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={sn ? '该设备没有联动动作' : '输入设备 SN 查询它作为触发设备与被控设备的联动'}
            />
          ),
        }}
      />
    </div>
  )
}
