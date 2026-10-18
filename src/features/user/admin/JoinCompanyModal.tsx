import { useQuery } from '@tanstack/react-query'
import { Form, Modal, Radio, Select } from 'antd'
import { useEffect, useState } from 'react'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'
import { type CompanyRole, userApi } from './api'

/** 用户加入企业：选择企业 (排除已加入的) 与企业角色 */
export function JoinCompanyModal({
  open,
  userId,
  joinedIds,
  onClose,
  onDone,
}: {
  open: boolean
  userId: number
  joinedIds: Set<number>
  onClose: () => void
  onDone: () => void
}) {
  const [form] = Form.useForm<{ companyId: number; role: CompanyRole }>()
  const [keyword, setKeyword] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (open) {
      form.resetFields()
      setKeyword('')
    }
  }, [open, form])

  const { data, isFetching } = useQuery({
    queryKey: ['admin', 0, 'companies', 'search', keyword],
    queryFn: () => userApi.searchCompanies(keyword),
    enabled: open,
  })

  const submit = async () => {
    const v = await form.validateFields()
    setSaving(true)
    try {
      await userApi.join(userId, v.companyId, v.role)
      notify.success('已加入企业')
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
      title="加入企业"
      okText="加入"
      confirmLoading={saving}
      onOk={submit}
      onCancel={onClose}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="mt-4" initialValues={{ role: 'user' }}>
        <Form.Item name="companyId" label="企业" rules={[{ required: true, message: '请选择企业' }]}>
          <Select
            showSearch
            filterOption={false}
            onSearch={setKeyword}
            loading={isFetching}
            placeholder="搜索企业名称"
            options={(data?.records ?? []).map((c) => ({
              value: c.id,
              disabled: joinedIds.has(c.id),
              label: `${c.name}${joinedIds.has(c.id) ? ' (已加入)' : c.status !== 'active' ? ' (已停用)' : ''}`,
            }))}
          />
        </Form.Item>
        <Form.Item name="role" label="企业角色" tooltip="管理员可进入该企业的企业管理端">
          <Radio.Group
            optionType="button"
            options={[
              { value: 'user', label: '成员' },
              { value: 'admin', label: '管理员' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
