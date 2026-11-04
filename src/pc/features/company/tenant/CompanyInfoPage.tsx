import { EditOutlined, LockOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, Button, Card, Descriptions, Form, Input, Tooltip } from 'antd'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { FormDrawer } from '@/components/form/FormDrawer'
import { OssUpload } from '@/components/form/OssUpload'
import { ACTIVE_STATUS, EnumTag, ExpireTag } from '@/components/StatusTag'
import { authKeys } from '@/features/auth/keys'
import { useCompanyId } from '@/hooks/session'
import { fmtDateTime } from '@/lib/time'
import {
  type CompanyTenantBody,
  type TenantCompany,
  tenantCompanyKey,
  tenantCompanyQuery,
  updateTenantCompany,
} from './api'

/** 由平台管理的字段：只读并标注 */
function PlatformManaged({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      {children}
      <Tooltip title="由平台管理员维护，如需修改请联系平台">
        <span className="text-fg-tertiary text-xs">
          <LockOutlined /> 由平台管理
        </span>
      </Tooltip>
    </span>
  )
}

const EDITABLE = ['logo', 'contactPerson', 'contactPhone', 'contactEmail', 'address', 'description'] as const
type FormValues = Required<Pick<CompanyTenantBody, (typeof EDITABLE)[number]>>

const toForm = (c: TenantCompany): FormValues => ({
  logo: c.logo,
  contactPerson: c.contactPerson,
  contactPhone: c.contactPhone,
  contactEmail: c.contactEmail,
  address: c.address,
  description: c.description,
})

/** 企业信息 (FRONTEND_DESIGN §4.5)：可改 Logo、联系人、电话、邮箱、地址、描述；名称、状态、过期时间只读 */
export default function CompanyInfoPage() {
  const cid = useCompanyId()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const { data: c, isPending } = useQuery(tenantCompanyQuery(cid))

  const submit = async (v: FormValues) => {
    // 部分更新：清空的字段传空串
    const body: CompanyTenantBody = Object.fromEntries(EDITABLE.map((k) => [k, (v[k] ?? '').trim()]))
    const saved = await updateTenantCompany(cid, body)
    qc.setQueryData(tenantCompanyKey(cid), saved)
    // 企业切换器中的 Logo 来自"我的企业"
    qc.invalidateQueries({ queryKey: authKeys.companies })
  }

  return (
    <>
      <Card
        variant="borderless"
        loading={isPending}
        title={
          c && (
            <span className="flex items-center gap-3">
              <Avatar shape="square" size={40} src={c.logo || undefined} className="bg-primary!">
                {c.name.slice(0, 1)}
              </Avatar>
              <span>{c.name}</span>
              <EnumTag value={c.status} defs={ACTIVE_STATUS} />
            </span>
          )
        }
        extra={
          <Button type="primary" icon={<EditOutlined />} disabled={!c} onClick={() => setEditing(true)}>
            编辑资料
          </Button>
        }
      >
        {c && (
          <Descriptions column={{ xs: 1, md: 2 }} bordered size="middle">
            <Descriptions.Item label="企业全称">
              <PlatformManaged>{c.name}</PlatformManaged>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <PlatformManaged>
                <EnumTag value={c.status} defs={ACTIVE_STATUS} />
              </PlatformManaged>
            </Descriptions.Item>
            <Descriptions.Item label="服务过期时间" span="filled">
              <PlatformManaged>
                <ExpireTag value={c.expiredAt} />
              </PlatformManaged>
            </Descriptions.Item>
            <Descriptions.Item label="联系人">{c.contactPerson || '—'}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{c.contactPhone || '—'}</Descriptions.Item>
            <Descriptions.Item label="联系邮箱" span="filled">
              {c.contactEmail || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="地址" span="filled">
              {c.address || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="描述" span="filled">
              <span className="whitespace-pre-wrap">{c.description || '—'}</span>
            </Descriptions.Item>
            <Descriptions.Item label="成员 / 设备 / 园区">
              {c.memberCount} / {c.deviceCount} / {c.siteCount}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">{fmtDateTime(c.createdAt)}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>
      <FormDrawer<FormValues>
        open={editing}
        title="编辑企业资料"
        initialValues={c ? toForm(c) : undefined}
        onClose={() => setEditing(false)}
        onSubmit={submit}
      >
        <Form.Item name="logo" label="Logo">
          <OssUpload scene="company-logo" size={72} />
        </Form.Item>
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item name="contactPerson" label="联系人" rules={[{ max: 50 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contactPhone" label="联系电话" rules={[{ max: 20 }]}>
            <Input />
          </Form.Item>
        </div>
        <Form.Item
          name="contactEmail"
          label="联系邮箱"
          rules={[{ type: 'email', message: '邮箱格式不正确' }, { max: 100 }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="address" label="地址" rules={[{ max: 200 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="描述" rules={[{ max: 2000 }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
        <div className="text-fg-tertiary text-xs">
          <LockOutlined /> 企业名称、状态与服务过期时间由平台管理员维护。
        </div>
      </FormDrawer>
    </>
  )
}
