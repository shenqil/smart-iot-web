import { Form, Input, Modal } from 'antd'
import { useEffect, useState } from 'react'
import { isApiError } from '@/api/errors'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'
import { applyFormErrors, isValidationError } from '@/lib/form'
import { PASSWORD_RULES, type User, userApi } from './api'

/** 重置密码：该用户所有设备上的登录随即失效 */
export function ResetPasswordModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const [form] = Form.useForm<{ password: string; confirm: string }>()
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (user) form.resetFields()
  }, [user, form])

  const submit = async () => {
    if (!user) return
    const { password } = await form.validateFields()
    setSaving(true)
    try {
      await userApi.resetPassword(user.id, password)
      notify.success(`已重置 ${user.username} 的密码，其登录已失效`)
      onClose()
    } catch (e) {
      if (isApiError(e) && isValidationError(e)) applyFormErrors(form, e)
      else handleGlobalError(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={Boolean(user)}
      title={`重置密码：${user?.username ?? ''}`}
      okText="重置"
      confirmLoading={saving}
      onOk={submit}
      onCancel={onClose}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item name="password" label="新密码" rules={PASSWORD_RULES}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="确认新密码"
          dependencies={['password']}
          rules={[
            { required: true, message: '请再次输入' },
            ({ getFieldValue }) => ({
              validator: (_, v) =>
                !v || v === getFieldValue('password') ? Promise.resolve() : Promise.reject(new Error('两次输入不一致')),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
