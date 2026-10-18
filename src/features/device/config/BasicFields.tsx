import { Form, Input, InputNumber, Radio, Select } from 'antd'
import { OssUpload } from '@/components/form/OssUpload'
import { LocationPicker } from '@/components/map/LocationPicker'
import { useDeviceTypes } from '@/features/dict/api'

/** 设备基本信息字段 (登记与修改共用；SN 与通道数只在登记时填写) */
export function BasicFields() {
  const types = useDeviceTypes()
  return (
    <>
      <Form.Item
        name="name"
        label="设备名称"
        rules={[{ required: true, whitespace: true, message: '请输入名称' }, { max: 100 }]}
      >
        <Input />
      </Form.Item>
      <div className="grid grid-cols-2 gap-x-4">
        <Form.Item name="deviceTypeId" label="设备类型">
          <Select allowClear placeholder="未分类" options={types.options} showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item
          name="readInterval"
          label="采集间隔 (秒)"
          tooltip="1~3600 秒；修改后设备重连时生效"
          rules={[{ required: true, message: '请输入采集间隔' }]}
        >
          <InputNumber className="w-full" min={1} max={3600} precision={0} />
        </Form.Item>
      </div>
      <Form.Item name="location" label="安装位置">
        <LocationPicker />
      </Form.Item>
      <div className="grid grid-cols-2 gap-x-4">
        <Form.Item name="macAddress" label="MAC 地址" rules={[{ max: 30 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="simCard" label="SIM 卡号 / ICCID" rules={[{ max: 30 }]}>
          <Input />
        </Form.Item>
      </div>
      <Form.Item name="status" label="状态" tooltip="停用的设备立即断开且不能接入">
        <Radio.Group
          optionType="button"
          options={[
            { value: 'active', label: '启用' },
            { value: 'inactive', label: '停用' },
          ]}
        />
      </Form.Item>
      <Form.Item name="coverImage" label="封面图">
        <OssUpload scene="device-cover" />
      </Form.Item>
      <Form.Item name="description" label="描述" rules={[{ max: 2000 }]}>
        <Input.TextArea rows={3} />
      </Form.Item>
    </>
  )
}
