import { Form, InputNumber, Modal, Radio } from 'antd'
import { useEffect } from 'react'
import type { SensorCorrection } from './api'

type Mode = '' | 'coefficient' | 'error' | 'custom'

/** 通道数值校准：系数 (y = ax + b) / 误差 (y = x + b) / 自定义 (固定值 + 浮动) */
export function CorrectionModal({
  open,
  value,
  onOk,
  onCancel,
}: {
  open: boolean
  value?: SensorCorrection
  onOk: (v: SensorCorrection | undefined) => void
  onCancel: () => void
}) {
  const [form] = Form.useForm<SensorCorrection & { mode: Mode }>()
  const mode = Form.useWatch('mode', form) as Mode | undefined
  useEffect(() => {
    if (open)
      form.setFieldsValue({
        coefficientValue: 1,
        errorValue: 0,
        customValue: 0,
        floatValue: 0,
        ...value,
        mode: (value?.mode as Mode) ?? '',
      })
  }, [open, value, form])

  const submit = async () => {
    const v = await form.validateFields()
    if (!v.mode) return onOk(undefined)
    const out: SensorCorrection = { mode: v.mode }
    if (v.mode === 'coefficient') Object.assign(out, { coefficientValue: v.coefficientValue, errorValue: v.errorValue })
    if (v.mode === 'error') Object.assign(out, { errorValue: v.errorValue })
    if (v.mode === 'custom') Object.assign(out, { customValue: v.customValue, floatValue: v.floatValue })
    onOk(out)
  }

  return (
    <Modal open={open} title="数值校准" onOk={submit} onCancel={onCancel} okText="确定" destroyOnHidden>
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item name="mode" label="校准方式">
          <Radio.Group
            optionType="button"
            options={[
              { value: '', label: '不校准' },
              { value: 'coefficient', label: '系数' },
              { value: 'error', label: '误差' },
              { value: 'custom', label: '自定义' },
            ]}
          />
        </Form.Item>
        {mode === 'coefficient' && (
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="coefficientValue" label="系数 a" extra="y = x × a + b；a 为 0 视为 1">
              <InputNumber className="w-full" step={0.01} />
            </Form.Item>
            <Form.Item name="errorValue" label="偏置 b">
              <InputNumber className="w-full" step={0.1} />
            </Form.Item>
          </div>
        )}
        {mode === 'error' && (
          <Form.Item name="errorValue" label="误差 b" extra="y = x + b">
            <InputNumber className="w-full" step={0.1} />
          </Form.Item>
        )}
        {mode === 'custom' && (
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="customValue" label="固定值" extra="y = 固定值 + 随机 × 浮动 (模拟值)">
              <InputNumber className="w-full" />
            </Form.Item>
            <Form.Item name="floatValue" label="浮动">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
          </div>
        )}
      </Form>
    </Modal>
  )
}
