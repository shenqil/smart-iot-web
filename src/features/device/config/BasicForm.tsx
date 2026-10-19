import { Button, Descriptions, Form } from 'antd'
import { useEffect } from 'react'
import { type LngLat, toLngLat } from '@/components/map/LocationPicker'
import { fmtDateTime } from '@/lib/time'
import type { DeviceDetail, DeviceUpdateBody } from './api'
import { BasicFields } from './BasicFields'

type FormValues = Omit<DeviceUpdateBody, 'name' | 'longitude' | 'latitude'> & { name: string; location?: LngLat }

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
        onFinish={async ({ location, ...v }) => {
          await onSave({
            ...v,
            name: v.name.trim(),
            deviceTypeId: v.deviceTypeId ?? null,
            longitude: location ? location[0] : null,
            latitude: location ? location[1] : null,
          })
        }}
      >
        <BasicFields />
        <Button type="primary" htmlType="submit" loading={saving}>
          保存基本信息
        </Button>
      </Form>
      <Descriptions column={1} size="small" bordered title="规格 (登记后不可修改)">
        <Descriptions.Item label="设备 SN">
          <span className="font-mono">{device.deviceSn}</span>
        </Descriptions.Item>
        <Descriptions.Item label="传感器通道数">{device.maxSensorChannels}</Descriptions.Item>
        <Descriptions.Item label="继电器通道数">{device.maxRelayChannels}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{fmtDateTime(device.createdAt)}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{fmtDateTime(device.updatedAt)}</Descriptions.Item>
      </Descriptions>
    </div>
  )
}
