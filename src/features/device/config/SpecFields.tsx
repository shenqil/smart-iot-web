import { Form, Input, InputNumber } from 'antd'

/** 登记设备时才填写的规格：SN 与通道数 (登记后不可修改)，平台与企业登记共用 */
export function SpecFields() {
  return (
    <>
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
    </>
  )
}

/** 登记表单默认值 (与后端默认一致) */
export const SPEC_DEFAULTS = {
  maxSensorChannels: 16,
  maxRelayChannels: 32,
  readInterval: 60,
  status: 'active',
} as const
