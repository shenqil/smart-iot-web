import { useQuery } from '@tanstack/react-query'
import { Form, Modal, Radio, Select } from 'antd'
import { useEffect, useState } from 'react'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'
import { adminDeviceApi } from './api'

/** 批量授权 / 撤销授权：选中的设备 × 选择的企业 (最多 100 家) */
export function BatchAuthorizeModal({
  deviceIds,
  onClose,
  onDone,
}: {
  deviceIds: number[] | null
  onClose: () => void
  onDone: () => void
}) {
  const [form] = Form.useForm<{ companyIds: number[]; action: 'add' | 'remove' }>()
  const [keyword, setKeyword] = useState('')
  const [saving, setSaving] = useState(false)
  const open = Boolean(deviceIds?.length)
  useEffect(() => {
    if (open) form.resetFields()
  }, [open, form])

  const { data, isFetching } = useQuery({
    queryKey: ['admin', 0, 'companies', 'search', keyword],
    queryFn: () => adminDeviceApi.searchCompanies(keyword),
    enabled: open,
  })

  const submit = async () => {
    const v = await form.validateFields()
    setSaving(true)
    try {
      const r = await adminDeviceApi.batchCompanies(deviceIds ?? [], v.companyIds, v.action)
      notify.success(v.action === 'add' ? `新增 ${r.added} 条授权` : `撤销 ${r.removed} 条授权`)
      onDone()
      onClose()
    } catch (e) {
      handleGlobalError(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={`批量授权 (${deviceIds?.length ?? 0} 台设备)`}
      okText="确定"
      confirmLoading={saving}
      onOk={submit}
      onCancel={onClose}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="mt-4" initialValues={{ action: 'add' }}>
        <Form.Item name="action" label="操作">
          <Radio.Group
            optionType="button"
            options={[
              { value: 'add', label: '授权给企业' },
              { value: 'remove', label: '撤销企业授权' },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="companyIds"
          label="企业"
          rules={[
            { required: true, message: '请选择企业' },
            { type: 'array', max: 100, message: '一次最多 100 家企业' },
          ]}
          extra="撤销授权时会同时解除设备在该企业园区下的挂载；授权后需企业管理员挂载到园区，数据使用端才可见。"
        >
          <Select
            mode="multiple"
            showSearch
            filterOption={false}
            onSearch={setKeyword}
            loading={isFetching}
            placeholder="搜索企业名称"
            options={(data?.records ?? []).map((c) => ({
              value: c.id,
              label: `${c.name}${c.status !== 'active' ? ' (已停用)' : ''}`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
