import { useQueryClient } from '@tanstack/react-query'
import { Alert, Form, Input } from 'antd'
import { FormDrawer } from '@/components/form/FormDrawer'
import { useCompanyId } from '@/hooks/session'
import { invalidateTenant } from '@/lib/tenant'
import { PASSWORD_RULES, PHONE_RULES, USERNAME_RULES } from '../admin/api'
import { type MemberCreateBody, tenantUserApi } from './api'

/** 企业创建用户 (FRONTEND_DESIGN §4.4)：自动以"成员"角色加入本企业；用户名、手机号全局唯一 */
export function MemberCreateDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cid = useCompanyId()
  const qc = useQueryClient()
  const submit = async (v: MemberCreateBody) => {
    await tenantUserApi(cid).create({
      ...v,
      username: v.username.trim(),
      nickname: v.nickname?.trim() || undefined,
      phone: v.phone?.trim() || undefined,
    })
    invalidateTenant(qc, cid, 'users', 'company')
  }
  return (
    <FormDrawer<MemberCreateBody>
      open={open}
      title="创建用户"
      width={480}
      onClose={onClose}
      onSubmit={submit}
      successText="用户已创建并加入本企业"
      conflictField="username"
    >
      <Alert
        className="mb-4"
        type="info"
        showIcon
        title="新用户自动以「成员」身份加入本企业。已有账号的用户需由平台管理员添加。"
      />
      <Form.Item name="username" label="用户名" rules={USERNAME_RULES} tooltip="全局唯一，用于登录">
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item name="password" label="初始密码" rules={PASSWORD_RULES}>
        <Input.Password autoComplete="new-password" />
      </Form.Item>
      <Form.Item name="nickname" label="昵称" rules={[{ max: 50 }]} tooltip="操作记录、告警处理人显示的名称">
        <Input />
      </Form.Item>
      <Form.Item name="phone" label="手机号" rules={PHONE_RULES} tooltip="全局唯一">
        <Input />
      </Form.Item>
    </FormDrawer>
  )
}
