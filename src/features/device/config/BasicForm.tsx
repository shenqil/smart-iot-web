import { Alert, Button, Descriptions, Form } from 'antd'
import { useEffect } from 'react'
import { type LngLat, toLngLat } from '@/components/map/LocationPicker'
import { fmtDateTime } from '@/lib/time'
import type { DeviceDetail, DeviceUpdateBody } from './api'
import { BasicFields } from './BasicFields'

// 状态多一个只读的 fault (系统判定损坏)，提交时不回传
type FormValues = Omit<DeviceUpdateBody, 'name' | 'longitude' | 'latitude' | 'status'> & {
  name: string
  location?: LngLat
  status?: DeviceDetail['status']
}

const toForm = (d: DeviceDetail): FormValues => ({
  name: d.name,
  description: d.description,
  deviceTypeId: d.deviceTypeId ?? undefined,
  readInterval: d.readInterval,
  location: toLngLat(d),
  coverImage: d.coverImage,
  macAddress: d.macAddress,
  simCard: d.simCard,
  status: d.status,
})

/** 基本信息：接口为部分更新 (未传不修改)，提交时带上全部字段；清空的设备类型与坐标显式传 null */
export function BasicForm({
  device,
  saving,
  onSave,
  onDirtyChange,
}: {
  device: DeviceDetail
  saving: boolean
  onSave: (b: DeviceUpdateBody) => Promise<unknown>
  onDirtyChange?: (dirty: boolean) => void
}) {
  const [form] = Form.useForm<FormValues>()
  useEffect(() => {
    form.setFieldsValue(toForm(device))
    onDirtyChange?.(false)
  }, [device, form, onDirtyChange])

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <Form<FormValues>
        form={form}
        layout="vertical"
        className="max-w-2xl"
        requiredMark="optional"
        onValuesChange={() => onDirtyChange?.(true)}
        onFinish={async ({ location, status, ...v }) => {
          await onSave({
            ...v,
            // 损坏 (fault) 只能由系统设置：未改为启用 / 停用时不提交状态
            ...(status === 'fault' ? {} : { status }),
            name: v.name.trim(),
            deviceTypeId: v.deviceTypeId ?? null,
            longitude: location ? location[0] : null,
            latitude: location ? location[1] : null,
          })
        }}
      >
        {device.status === 'fault' && (
          <Alert
            className="mb-4"
            type="error"
            showIcon
            message="设备已被系统标记为损坏"
            description="设备上报的传感器 / 继电器路数少于登记的通道数，已断开且不能接入 (详情见告警记录)。通道数登记后不可修改：请更换为相符的设备，或删除后按实际规格重新登记；处理后把状态改为「启用」并保存，设备重连即可上线。"
          />
        )}
        <BasicFields showFault={device.status === 'fault'} />
        <Button type="primary" htmlType="submit" loading={saving}>
          保存基本信息
        </Button>
      </Form>
      <Descriptions column={1} size="small" bordered title="规格 (登记后不可修改)">
        <Descriptions.Item label="设备 SN">
          <span className="font-mono">{device.deviceSn}</span>
        </Descriptions.Item>
        <Descriptions.Item label="传感器通道数">{device.sensorChannels}</Descriptions.Item>
        <Descriptions.Item label="继电器通道数">{device.relayChannels}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{fmtDateTime(device.createdAt)}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{fmtDateTime(device.updatedAt)}</Descriptions.Item>
      </Descriptions>
    </div>
  )
}
