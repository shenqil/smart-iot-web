import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Switch, Table, Tag, Tooltip } from 'antd'
import { useState } from 'react'
import { notify } from '@/app/notify'
import { nextAtText, schedulePeriodText } from '@/features/relay/schedule'
import { confirmAction } from '@/lib/confirm'
import { type DeviceConfigApi, type DeviceDetail, type RelaySchedule, schedulesKey } from './api'
import { ScheduleModal, scheduleBody } from './ScheduleModal'

/**
 * 定时开关 (平台与企业共用，docs/RELAY_SCHEDULE.md §8)：到点开 / 关继电器，保存后立即生效 (不需要设备重连)。
 * 一路继电器可有多组规则，允许重叠，各组独立执行。
 */
export function SchedulesEditor({ cfg, device }: { cfg: DeviceConfigApi; device: DeviceDetail }) {
  const qc = useQueryClient()
  const key = schedulesKey(cfg, device.id)
  // 每分钟刷新一次"下一次"时刻
  const { data, isPending } = useQuery({
    queryKey: key,
    queryFn: () => cfg.schedules(device.id),
    refetchInterval: 60_000,
  })
  const [editing, setEditing] = useState<RelaySchedule | 'new' | null>(null)
  const changed = () => qc.invalidateQueries({ queryKey: key })
  const toggle = useMutation({
    mutationFn: (s: RelaySchedule) => cfg.updateSchedule(s.id, { ...scheduleBody(s), enabled: !s.enabled }),
    onSuccess: (s) => {
      changed()
      notify.success(s.enabled ? '已启用' : '已停用')
    },
  })

  const relays = [...device.relays].sort((a, b) => a.channelNum - b.channelNum)
  const list = data ?? []

  return (
    <div className="layout-fill">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="text-fg-secondary">
          到点自动开启 / 关闭继电器
          (秒级)；失败按设置重试，全部失败产生「继电器控制失败」告警，每次执行都有操作记录。保存后立即生效。
        </span>
        <Button
          type="primary"
          className="ml-auto"
          icon={<PlusOutlined />}
          disabled={!relays.length}
          onClick={() => setEditing('new')}
        >
          新增定时
        </Button>
      </div>
      {!relays.length && (
        <Alert className="mb-3" type="info" showIcon message="还没有配置继电器通道，请先在「继电器配置」页签中配置。" />
      )}
      <Table<RelaySchedule>
        size="small"
        rowKey="id"
        loading={isPending}
        dataSource={list}
        pagination={false}
        rootClassName="layout-fill"
        scroll={{ x: 'max-content', y: 400 }}
        rowClassName={(s) => (s.enabled && s.relayConfigured ? '' : 'opacity-70')}
        columns={[
          {
            title: '继电器',
            width: 200,
            render: (_, s) =>
              s.relayConfigured ? (
                <span>
                  <span className="font-mono text-fg-tertiary">CH {String(s.relayIndex).padStart(2, '0')}</span>{' '}
                  {s.relayName}
                </span>
              ) : (
                <Tooltip title="继电器通道已删除或不在规格内，规则不执行">
                  <Tag color="error" className="m-0">
                    CH {String(s.relayIndex).padStart(2, '0')} 未配置
                  </Tag>
                </Tooltip>
              ),
          },
          {
            title: '时段',
            width: 220,
            render: (_, s) => <span className="font-mono">{schedulePeriodText(s)}</span>,
          },
          { title: '执行日', dataIndex: 'weekdayText', width: 180 },
          {
            title: '失败重试',
            width: 140,
            render: (_, s) => (s.retryCount ? `${s.retryCount} 次 · 间隔 ${s.retryIntervalSec}s` : '不重试'),
          },
          {
            title: '下一次',
            width: 190,
            render: (_, s) =>
              s.nextOn && s.nextOff ? (
                <div className="text-xs leading-5">
                  <div>开 {nextAtText(s.nextOn)}</div>
                  <div className="text-fg-secondary">关 {nextAtText(s.nextOff)}</div>
                </div>
              ) : (
                <span className="text-fg-tertiary">—</span>
              ),
          },
          { title: '备注', dataIndex: 'remark', ellipsis: true, render: (v) => v || '—' },
          {
            title: '启用',
            width: 70,
            render: (_, s) => (
              <Switch
                size="small"
                checked={s.enabled}
                loading={toggle.isPending && toggle.variables?.id === s.id}
                disabled={!s.enabled && !s.relayConfigured}
                onChange={() => toggle.mutate(s)}
              />
            ),
          },
          {
            title: '操作',
            width: 90,
            fixed: 'right',
            render: (_, s) => (
              <>
                <Tooltip title="修改">
                  <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditing(s)} />
                </Tooltip>
                <Tooltip title="删除">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      confirmAction({
                        title: '删除这条定时规则？',
                        content: `${s.relayName || `CH ${s.relayIndex}`} · ${s.weekdayText} ${schedulePeriodText(s)}。删除后立即停止执行，不改变继电器当前状态。`,
                        okText: '删除',
                        onOk: () => cfg.deleteSchedule(s.id),
                        successText: '已删除',
                        onDone: changed,
                      })
                    }
                  />
                </Tooltip>
              </>
            ),
          },
        ]}
      />
      <ScheduleModal
        open={editing != null}
        schedule={editing === 'new' ? undefined : (editing ?? undefined)}
        relays={relays}
        onClose={() => setEditing(null)}
        onSave={async (body) => {
          if (editing === 'new') await cfg.createSchedule(device.id, body)
          else if (editing) await cfg.updateSchedule(editing.id, body)
          changed()
          notify.success('定时规则已保存')
        }}
      />
    </div>
  )
}
