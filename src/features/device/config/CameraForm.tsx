import { Button, Form, Input, InputNumber, Select } from 'antd'
import { useEffect } from 'react'
import type { CameraBody, CameraView } from './api'

const SECRET_MASK = '******'
const VENDORS = [
  { value: 'ezviz', label: '萤石云' },
  { value: 'hikvision', label: '海康威视' },
  { value: 'dahua', label: '大华' },
  { value: 'rtsp', label: 'RTSP' },
  { value: 'onvif', label: 'ONVIF' },
]

interface Values {
  vendor?: string
  appKey: string
  appSecret: string
  serialNo: string
  cameraChannel: number
  liveUrl: string
}

/** 摄像头配置 (部分更新)：Secret 输出为 ******，不修改则原样提交，后端保留原值 */
export function CameraForm({
  camera,
  saving,
  onSave,
  onDirtyChange,
}: {
  /** 未配置为 null */
  camera: CameraView | null | undefined
  saving: boolean
  onSave: (c: CameraBody) => Promise<unknown>
  onDirtyChange?: (dirty: boolean) => void
}) {
  const [form] = Form.useForm<Values>()
  useEffect(() => {
    form.setFieldsValue({
      vendor: camera?.vendor || undefined,
      appKey: camera?.appKey ?? '',
      appSecret: camera?.appSecret ?? '',
      serialNo: camera?.serialNo ?? '',
      cameraChannel: camera?.cameraChannel ?? 0,
      liveUrl: camera?.liveUrl ?? '',
    })
    onDirtyChange?.(false)
  }, [camera, form, onDirtyChange])

  return (
    <Form<Values>
      form={form}
      layout="vertical"
      className="max-w-2xl"
      onValuesChange={() => onDirtyChange?.(true)}
      onFinish={async (v) => {
        await onSave({ ...v, vendor: v.vendor ?? '', appSecret: v.appSecret ?? '' })
        onDirtyChange?.(false)
      }}
    >
      <div className="grid grid-cols-2 gap-x-4">
        <Form.Item name="vendor" label="品牌 / 协议">
          <Select allowClear options={VENDORS} placeholder="未配置" />
        </Form.Item>
        <Form.Item name="serialNo" label="序列号 (SN)">
          <Input />
        </Form.Item>
        <Form.Item name="appKey" label="开放平台 AppKey">
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="appSecret"
          label="开放平台 Secret"
          tooltip={`已保存的 Secret 显示为 ${SECRET_MASK}，不修改则保留原值`}
        >
          <Input.Password autoComplete="new-password" placeholder="未设置" />
        </Form.Item>
        <Form.Item name="cameraChannel" label="监控通道号">
          <InputNumber className="w-full" min={0} precision={0} />
        </Form.Item>
      </div>
      <Form.Item name="liveUrl" label="直播地址" tooltip="HLS / FLV / WebRTC / RTSP 播放地址">
        <Input placeholder="如 https://open.ys7.com/....m3u8" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={saving}>
        保存摄像头配置
      </Button>
    </Form>
  )
}
