import { useQueryClient } from '@tanstack/react-query'
import { Alert, Form, Input, InputNumber } from 'antd'
import { FormDrawer } from '@/components/form/FormDrawer'
import { fromLngLat, type LngLat } from '@/components/map/LocationPicker'
import { BasicFields } from '../config/BasicFields'
import { adminDeviceApi, adminDeviceKeys, type DeviceCreateBody } from './api'

type FormValues = Omit<DeviceCreateBody, 'longitude' | 'latitude'> & { location?: LngLat }

/** 平台登记设备 (进入公海，需另行授权给企业) */
export function DeviceCreateDrawer({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: (id: number) => void
}) {
  const qc = useQueryClient()
  const submit = async ({ location, ...v }: FormValues) => {
    const d = await adminDeviceApi.create({
      ...v,
      deviceSn: v.deviceSn.trim(),
      name: v.name.trim(),
      ...fromLngLat(location),
    })
    qc.invalidateQueries({ queryKey: adminDeviceKeys.all })
    onSaved(d.id)
  }
  return (
    <FormDrawer<FormValues>
      open={open}
      title="登记设备"
      width={600}
      initialValues={{ maxSensorChannels: 16, maxRelayChannels: 32, readInterval: 60, status: 'active' }}
      onClose={onClose}
      onSubmit={submit}
      conflictField="deviceSn"
    >
      <Alert
        className="mb-4"
        type="info"
        showIcon
        title="平台登记的设备进入公海 (不属于任何企业)，可在设备详情中授权给企业。"
      />
      <Form.Item
        name="deviceSn"
        label="设备 SN"
        tooltip="硬件 SN，全局唯一，登记后不可修改"
        rules={[
          { required: true, message: '请输入 SN' },
          { pattern: /^[A-Za-z0-9_.:-]{1,64}$/, message: '1~64 位字母、数字或 _ . : -' },
        ]}
      >
        <Input className="font-mono" />
      </Form.Item>
      <div className="grid grid-cols-2 gap-x-4">
        <Form.Item name="maxSensorChannels" label="传感器通道数" tooltip="登记后不可修改" rules={[{ required: true }]}>
          <InputNumber className="w-full" min={1} max={4096} precision={0} />
        </Form.Item>
        <Form.Item name="maxRelayChannels" label="继电器通道数" tooltip="登记后不可修改" rules={[{ required: true }]}>
          <InputNumber className="w-full" min={1} max={4096} precision={0} />
        </Form.Item>
      </div>
      <BasicFields />
    </FormDrawer>
  )
}
