import { Form, InputNumber, Modal, Radio } from 'antd'
import { useEffect } from 'react'
import type { Calibration, Simulation } from './api'

type Mode = 'none' | 'calibration' | 'simulation'

export interface CalibrationValue {
  calibration?: Calibration
  simulation?: Simulation
}

interface Values {
  mode: Mode
  scale: number
  offset: number
  base: number
  jitter: number
}

/** 通道数值校准：校准 (y = x × 系数 + 偏置) / 模拟值 (y = 基准 + 随机 × 浮动，不使用上报值) */
export function CalibrationModal({
  open,
  value,
  onOk,
  onCancel,
}: {
  open: boolean
  value?: CalibrationValue
  onOk: (v: CalibrationValue) => void
  onCancel: () => void
}) {
  const [form] = Form.useForm<Values>()
  const mode = Form.useWatch('mode', form)
  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      mode: value?.simulation ? 'simulation' : value?.calibration ? 'calibration' : 'none',
      scale: value?.calibration?.scale ?? 1,
      offset: value?.calibration?.offset ?? 0,
      base: value?.simulation?.base ?? 0,
      jitter: value?.simulation?.jitter ?? 0,
    })
  }, [open, value, form])

  const submit = async () => {
    const v = await form.validateFields()
    if (v.mode === 'calibration') return onOk({ calibration: { scale: v.scale, offset: v.offset } })
    if (v.mode === 'simulation') return onOk({ simulation: { base: v.base, jitter: v.jitter } })
    onOk({})
  }

  return (
    <Modal open={open} title="数值校准" onOk={submit} onCancel={onCancel} okText="确定" destroyOnHidden>
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item name="mode" label="方式">
          <Radio.Group
            optionType="button"
            options={[
              { value: 'none', label: '不校准' },
              { value: 'calibration', label: '校准' },
              { value: 'simulation', label: '模拟值' },
            ]}
          />
        </Form.Item>
        {mode === 'calibration' && (
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              name="scale"
              label="系数"
              extra="y = x × 系数 + 偏置"
              rules={[
                { validator: (_, v) => (v === 0 ? Promise.reject(new Error('系数不能为 0')) : Promise.resolve()) },
              ]}
            >
              <InputNumber className="w-full" step={0.01} />
            </Form.Item>
            <Form.Item name="offset" label="偏置">
              <InputNumber className="w-full" step={0.1} />
            </Form.Item>
          </div>
        )}
        {mode === 'simulation' && (
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="base" label="基准值" extra="y = 基准值 + 随机 × 浮动 (不使用设备上报值)">
              <InputNumber className="w-full" />
            </Form.Item>
            <Form.Item name="jitter" label="浮动">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
          </div>
        )}
      </Form>
    </Modal>
  )
}
