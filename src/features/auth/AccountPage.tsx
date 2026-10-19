import { ArrowLeftOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Descriptions, Form, Input, Layout, Space, Table, Tag } from 'antd'
import { useNavigate } from 'react-router'
import { api, unwrap } from '@/api/client'
import { isApiError } from '@/api/errors'
import { notify } from '@/app/notify'
import { Brand } from '@/components/Brand'
import { useMe, useMyCompanies } from '@/hooks/session'
import { UserMenu } from '@/layouts/UserMenu'
import { applyFormErrors, isValidationError } from '@/lib/form'
import { companyDenyReason, type MyCompany, portalHome } from '@/lib/portal'
import { fmtDate, fmtDateTime } from '@/lib/time'
import { usePref } from '@/stores/pref'
import { useSession } from '@/stores/session'
import { authKeys } from './keys'

const PASSWORD_RULE = { pattern: /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/, message: '8~64 个字符，须同时包含字母和数字' }

function ProfileCard() {
  const me = useMe()
  const qc = useQueryClient()
  const [form] = Form.useForm<{ nickname: string; phone: string }>()
  const save = useMutation({
    mutationFn: (v: { nickname: string; phone: string }) =>
      unwrap(api.PUT('/api/v1/auth/me', { body: { nickname: v.nickname ?? '', phone: v.phone ?? '' } })),
    meta: { silent: true },
    onSuccess: (u) => {
      qc.setQueryData(authKeys.me, u)
      notify.success('资料已保存')
    },
    onError: (e) => {
      if (!isApiError(e)) return
      if (isValidationError(e)) applyFormErrors(form, e)
      else notify.error(e.message)
    },
  })
  return (
    <Card title="基本资料">
      <Descriptions column={1} size="small" className="mb-4">
        <Descriptions.Item label="用户名">{me.username}</Descriptions.Item>
        <Descriptions.Item label="系统角色">{me.systemRole === 'admin' ? '平台管理员' : '普通用户'}</Descriptions.Item>
        <Descriptions.Item label="注册时间">{fmtDateTime(me.createdAt)}</Descriptions.Item>
      </Descriptions>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ nickname: me.nickname, phone: me.phone ?? '' }}
        onFinish={(v) => save.mutate(v)}
      >
        <Form.Item name="nickname" label="昵称" rules={[{ max: 50 }]}>
          <Input placeholder="用于操作记录中显示的名称" />
        </Form.Item>
        <Form.Item
          name="phone"
          label="手机号"
          rules={[{ pattern: /^(\+?[0-9-]{5,20})?$/, message: '手机号格式不正确' }]}
        >
          <Input />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={save.isPending}>
          保存
        </Button>
      </Form>
    </Card>
  )
}

function PasswordCard() {
  const qc = useQueryClient()
  const [form] = Form.useForm<{ oldPassword: string; newPassword: string; confirm: string }>()
  const change = useMutation({
    mutationFn: (v: { oldPassword: string; newPassword: string }) =>
      unwrap(api.PUT('/api/v1/auth/me/password', { body: { oldPassword: v.oldPassword, newPassword: v.newPassword } })),
    meta: { silent: true },
    onSuccess: (r) => {
      useSession.getState().setSession(r.token, r.expiresAt)
      if (r.user) qc.setQueryData(authKeys.me, r.user)
      form.resetFields()
      notify.success('密码已修改，其他设备上的登录已失效')
    },
    onError: (e) => {
      if (!isApiError(e)) return
      if (e.code === 'WRONG_PASSWORD') form.setFields([{ name: 'oldPassword', errors: [e.message] }])
      else if (e.code === 'SAME_PASSWORD') form.setFields([{ name: 'newPassword', errors: [e.message] }])
      else if (isValidationError(e)) applyFormErrors(form, e)
      else notify.error(e.message)
    },
  })
  return (
    <Card title="修改密码">
      <Form form={form} layout="vertical" onFinish={(v) => change.mutate(v)}>
        <Form.Item name="oldPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="新密码"
          rules={[{ required: true, message: '请输入新密码' }, PASSWORD_RULE]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="确认新密码"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator: (_, v) =>
                !v || v === getFieldValue('newPassword')
                  ? Promise.resolve()
                  : Promise.reject(new Error('两次输入不一致')),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={change.isPending}>
          修改密码
        </Button>
      </Form>
    </Card>
  )
}

function CompaniesCard() {
  const companies = useMyCompanies()
  const navigate = useNavigate()
  return (
    <Card title="我的企业">
      <Table<MyCompany>
        rowKey="companyId"
        size="middle"
        pagination={false}
        scroll={{ y: 360 }}
        dataSource={companies}
        locale={{ emptyText: '尚未加入任何企业' }}
        columns={[
          { title: '企业', dataIndex: 'name' },
          {
            title: '角色',
            dataIndex: 'role',
            render: (r) => (r === 'admin' ? <Tag color="processing">管理员</Tag> : '成员'),
          },
          {
            title: '状态',
            render: (_, c) => {
              const reason = companyDenyReason('app', c)
              return reason ? <Tag>{reason}</Tag> : <Tag color="success">正常</Tag>
            },
          },
          { title: '过期时间', dataIndex: 'expiredAt', render: (v) => (v ? fmtDate(v) : '不过期') },
          { title: '加入时间', dataIndex: 'joinedAt', render: fmtDate },
          {
            title: '操作',
            render: (_, c) => (
              <Space>
                <Button
                  size="small"
                  type="link"
                  disabled={!c.accessible}
                  onClick={() => navigate(portalHome('app', c.companyId))}
                >
                  数据使用
                </Button>
                {c.role === 'admin' && (
                  <Button
                    size="small"
                    type="link"
                    disabled={!c.manageable}
                    onClick={() => navigate(portalHome('tenant', c.companyId))}
                  >
                    企业管理
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />
    </Card>
  )
}

/** 个人中心 (FRONTEND_DESIGN §1.5) */
export default function AccountPage() {
  const navigate = useNavigate()
  const { lastPortal, lastCompanyId } = usePref()
  return (
    <Layout className="h-full">
      <Layout.Header className="flex items-center gap-4 border-line border-b border-solid">
        <Brand />
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(lastPortal ? portalHome(lastPortal, lastCompanyId) : '/')}
        >
          返回
        </Button>
        <div className="ml-auto">
          <UserMenu />
        </div>
      </Layout.Header>
      <Layout.Content className="overflow-auto p-6">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
          <ProfileCard />
          <PasswordCard />
          <div className="md:col-span-2">
            <CompaniesCard />
          </div>
        </div>
      </Layout.Content>
    </Layout>
  )
}
