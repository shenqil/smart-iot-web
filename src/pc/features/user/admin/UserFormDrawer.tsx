import { useQueryClient } from '@tanstack/react-query'
import { Alert, Form, Input, Radio } from 'antd'
import { FormDrawer } from '@/components/form/FormDrawer'
import { useMe } from '@/hooks/session'
import { PASSWORD_RULES, PHONE_RULES, USERNAME_RULES, type User, type UserCreateBody, userApi, userKeys } from './api'

/** 新建 / 编辑用户 (平台)：编辑自己时禁止修改系统角色与状态 */
export function UserFormDrawer({
  open,
  user,
  onClose,
  onSaved,
}: {
  open: boolean
  user?: User | null
  onClose: () => void
  onSaved?: (id: number) => void
}) {
  const qc = useQueryClient()
  const me = useMe()
  const self = user?.id === me.id

  const submit = async (v: UserCreateBody) => {
    const phone = v.phone?.trim() || undefined
    const saved = user
      ? await userApi.update(user.id, {
          username: v.username.trim(),
          nickname: v.nickname?.trim(),
          phone: phone ?? '',
          systemRole: v.systemRole ?? 'none',
          status: v.status,
        })
      : await userApi.create({ ...v, username: v.username.trim(), nickname: v.nickname?.trim(), phone })
    qc.invalidateQueries({ queryKey: userKeys.all })
    if (self) qc.invalidateQueries({ queryKey: ['auth', 'me'] })
    onSaved?.(saved.id)
  }

  return (
    <FormDrawer<UserCreateBody>
      open={open}
      title={user ? `编辑用户：${user.username}` : '新建用户'}
      width={480}
      initialValues={user ? { ...user, phone: user.phone ?? '' } : { systemRole: 'none', status: 'active' }}
      onClose={onClose}
      onSubmit={submit}
      conflictField="username"
    >
      {!user && (
        <Alert
          className="mb-4"
          type="info"
          showIcon
          title="新建的用户不属于任何企业 (公海用户)，创建后可在用户详情或企业详情中分配企业。"
        />
      )}
      <Form.Item name="username" label="用户名" rules={USERNAME_RULES}>
        <Input autoComplete="off" />
      </Form.Item>
      {!user && (
        <Form.Item name="password" label="初始密码" rules={PASSWORD_RULES}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      )}
      <Form.Item name="nickname" label="昵称" rules={[{ max: 50 }]} tooltip="操作记录、告警处理人显示的名称">
        <Input />
      </Form.Item>
      <Form.Item name="phone" label="手机号" rules={PHONE_RULES} tooltip="全局唯一">
        <Input />
      </Form.Item>
      <div className="grid grid-cols-2 gap-x-4">
        <Form.Item
          name="systemRole"
          label="系统角色"
          tooltip={self ? '不能修改自己的系统角色' : '平台管理员拥有平台管理端全部权限'}
        >
          <Radio.Group
            disabled={self}
            optionType="button"
            options={[
              { value: 'none', label: '普通用户' },
              { value: 'admin', label: '平台管理员' },
            ]}
          />
        </Form.Item>
        <Form.Item name="status" label="账号状态" tooltip={self ? '不能停用自己' : '停用后该用户立即下线'}>
          <Radio.Group
            disabled={self}
            optionType="button"
            options={[
              { value: 'active', label: '启用' },
              { value: 'inactive', label: '停用' },
            ]}
          />
        </Form.Item>
      </div>
      {user && !self && (
        <div className="text-fg-tertiary text-xs">修改系统角色或停用后，该用户当前的登录会立即失效。</div>
      )}
    </FormDrawer>
  )
}
