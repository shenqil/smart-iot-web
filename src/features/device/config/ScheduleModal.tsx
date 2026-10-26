import { Button, Checkbox, Form, Input, InputNumber, Modal, Select, Space, Switch, TimePicker } from 'antd'
import type { Dayjs } from 'dayjs'
import { useEffect, useState } from 'react'
import { handleGlobalError } from '@/app/queryClient'
import { WEEKDAY_OPTIONS } from '@/features/relay/schedule'
import { channelName } from '@/features/telemetry/lib/realtime'
import { dayjs } from '@/lib/time'
import type { RelayConfig, RelaySchedule, RelayScheduleBody } from './api'

const CLOCK = 'HH:mm:ss'
const ALL_DAYS = WEEKDAY_OPTIONS.map((o) => o.value)

interface Values {
  relayIndex: number
  start: Dayjs
  stop: Dayjs
  weekdays: number[]
  retryCount: number
  retryIntervalSec: number
  remark?: string
  enabled: boolean
}

const clock = (v: string) => dayjs(v, CLOCK)

/** 规则 -> 请求体 (修改为整体替换) */
export const scheduleBody = (s: RelaySchedule): RelayScheduleBody => ({
  relayIndex: s.relayIndex,
  enabled: s.enabled,
  start: s.start,
  stop: s.stop,
  weekdays: s.weekdays,
  retryCount: s.retryCount,
  retryIntervalSec: s.retryIntervalSec,
  remark: s.remark || undefined,
})

/** 新增 / 修改定时规则 (docs/RELAY_SCHEDULE.md §8) */
export function ScheduleModal({
  open,
  schedule,
  relays,
  onSave,
  onClose,
}: {
  open: boolean
  /** 修改的规则；为空表示新增 */
  schedule?: RelaySchedule
  /** 已配置的继电器通道 */
  relays: RelayConfig[]
  onSave: (body: RelayScheduleBody) => Promise<unknown>
  onClose: () => void
}) {
  const [form] = Form.useForm<Values>()
  const [saving, setSaving] = useState(false)
  const start = Form.useWatch('start', form)
  const stop = Form.useWatch('stop', form)
  const retryCount = Form.useWatch('retryCount', form)
  const crosses = start && stop && stop.format(CLOCK) < start.format(CLOCK)

  useEffect(() => {
    if (!open) return
    form.resetFields()
    form.setFieldsValue(
      schedule
        ? {
            relayIndex: schedule.relayIndex,
            start: clock(schedule.start),
            stop: clock(schedule.stop),
            weekdays: schedule.weekdays,
            retryCount: schedule.retryCount,
            retryIntervalSec: schedule.retryIntervalSec,
            remark: schedule.remark,
            enabled: schedule.enabled,
          }
        : { relayIndex: relays[0]?.channelNum, weekdays: ALL_DAYS, retryCount: 0, retryIntervalSec: 30, enabled: true },
    )
  }, [open, schedule, relays, form])

  const submit = async () => {
    const v = await form.validateFields()
    setSaving(true)
    try {
      await onSave({
        relayIndex: v.relayIndex,
        enabled: v.enabled,
        start: v.start.format(CLOCK),
        stop: v.stop.format(CLOCK),
        weekdays: [...v.weekdays].sort((a, b) => a - b),
        retryCount: v.retryCount,
        retryIntervalSec: v.retryIntervalSec,
        remark: v.remark?.trim() || undefined,
      })
      onClose()
    } catch (e) {
      handleGlobalError(e)
    } finally {
      setSaving(false)
    }
  }

  // 修改时保留原通道 (即使已被删除)，便于看清楚是哪一路
  const options = relays.map((r) => ({ value: r.channelNum, label: `CH ${r.channelNum} · ${channelName(r)}` }))
  if (schedule && !relays.some((r) => r.channelNum === schedule.relayIndex)) {
    options.unshift({ value: schedule.relayIndex, label: `CH ${schedule.relayIndex} (未配置)` })
  }

  return (
    <Modal
      open={open}
      title={schedule ? '修改定时规则' : '新增定时规则'}
      okText="保存"
      confirmLoading={saving}
      onOk={submit}
      onCancel={onClose}
      destroyOnHidden
      width={520}
    >
      <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
        <Form.Item name="relayIndex" label="继电器" rules={[{ required: true, message: '请选择继电器' }]}>
          <Select options={options} placeholder="选择继电器通道" />
        </Form.Item>
        <Space.Compact block>
          <Form.Item
            name="start"
            label="开启时刻"
            className="flex-1"
            rules={[{ required: true, message: '请选择开启时刻' }]}
          >
            <TimePicker format={CLOCK} className="w-full" needConfirm={false} />
          </Form.Item>
          <Form.Item
            name="stop"
            label="关闭时刻"
            className="ml-3 flex-1"
            dependencies={['start']}
            extra={crosses ? '早于开启时刻：次日关闭' : undefined}
            rules={[
              { required: true, message: '请选择关闭时刻' },
              ({ getFieldValue }) => ({
                validator: (_, v?: Dayjs) =>
                  v && getFieldValue('start')?.format(CLOCK) === v.format(CLOCK)
                    ? Promise.reject(new Error('不能与开启时刻相同'))
                    : Promise.resolve(),
              }),
            ]}
          >
            <TimePicker format={CLOCK} className="w-full" needConfirm={false} />
          </Form.Item>
        </Space.Compact>
        <Form.Item
          label={
            <Space>
              <span>执行日</span>
              <Button
                type="link"
                size="small"
                className="h-auto p-0"
                onClick={() => form.setFieldValue('weekdays', ALL_DAYS)}
              >
                每天
              </Button>
            </Space>
          }
          name="weekdays"
          tooltip="开启的日子；跨零点时，关闭属于开启的那一天"
          rules={[{ required: true, type: 'array', min: 1, message: '至少选择一天' }]}
        >
          <Checkbox.Group options={WEEKDAY_OPTIONS} />
        </Form.Item>
        <Space.Compact block>
          <Form.Item
            name="retryCount"
            label="失败重试次数"
            className="flex-1"
            tooltip="设备离线、手动接管中等原因执行失败时重试；全部失败后产生「继电器控制失败」告警"
            rules={[{ required: true, message: '请输入重试次数' }]}
          >
            <InputNumber min={0} precision={0} className="w-full" addonAfter="次" />
          </Form.Item>
          <Form.Item
            name="retryIntervalSec"
            label="重试间隔"
            className="ml-3 flex-1"
            rules={[{ required: true, message: '请输入重试间隔' }]}
          >
            <InputNumber min={1} precision={0} className="w-full" addonAfter="秒" disabled={!retryCount} />
          </Form.Item>
        </Space.Compact>
        <Form.Item name="remark" label="备注">
          <Input maxLength={100} placeholder="选填，如 夏季补光" />
        </Form.Item>
        <Form.Item name="enabled" label="启用" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}
