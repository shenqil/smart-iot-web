import { UserAddOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Tag, Tooltip } from 'antd'
import type { Key } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ACTIVE_STATUS, COMPANY_ROLE, EnumTag, enumOptions } from '@/components/StatusTag'
import { type PageColumn, PageTable } from '@/components/table/PageTable'
import { useCompanyId, useMe } from '@/hooks/session'
import { affectedText, confirmAction } from '@/lib/confirm'
import { invalidateTenant } from '@/lib/tenant'
import { fmtDateTime } from '@/lib/time'
import { canRemoveMember, type Member, tenantUserApi, tenantUserKeys } from './api'
import { MemberCreateDrawer } from './MemberCreateDrawer'
import { MemberDetailDrawer } from './MemberDetailDrawer'

/**
 * 成员管理 (FRONTEND_DESIGN §4.4)：列表含管理员；只能创建用户、移出普通成员。
 * 管理员行与自己不可勾选、不可移出
 */
export default function MemberListPage() {
  const cid = useCompanyId()
  const me = useMe()
  const api = tenantUserApi(cid)
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<number | null>(null)

  // 概览页"添加成员"快捷入口：?create=1
  useEffect(() => {
    if (params.get('create') !== '1') return
    setCreating(true)
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete('create')
        return p
      },
      { replace: true },
    )
  }, [params, setParams])

  const remove = (ids: Key[], clear?: () => void) =>
    confirmAction({
      title: `将 ${ids.length} 名成员移出本企业？`,
      content: '只解除与本企业的关系，账号保留；不再属于任何企业的用户由平台管理员管理。',
      okText: '移出',
      onOk: () => api.remove(ids as number[]),
      successText: affectedText('移出'),
      onDone: () => {
        clear?.()
        invalidateTenant(qc, cid, 'users', 'company')
      },
    })

  const denyReason = (r: Member) => (r.id === me.id ? '不能移出自己' : r.role === 'admin' ? '不能移出企业管理员' : null)

  const columns: PageColumn<Member>[] = [
    {
      title: '用户名',
      dataIndex: 'username',
      sortField: 'username',
      render: (v, r) => (
        <Button type="link" size="small" className="px-0" onClick={() => setViewing(r.id)}>
          {v}
          {r.id === me.id && <Tag className="ml-1">我</Tag>}
        </Button>
      ),
    },
    { title: '昵称', dataIndex: 'nickname', render: (v) => v || '—' },
    { title: '手机号', dataIndex: 'phone', render: (v) => v || '—' },
    {
      title: '企业角色',
      dataIndex: 'role',
      width: 120,
      render: (v) => <EnumTag value={v} defs={COMPANY_ROLE} />,
    },
    {
      title: '账号状态',
      dataIndex: 'status',
      width: 150,
      render: (v, r) => (
        <>
          <EnumTag value={v} defs={ACTIVE_STATUS} />
          {r.systemRole === 'admin' && <Tag color="purple">平台管理员</Tag>}
        </>
      ),
    },
    { title: '加入时间', dataIndex: 'joinedAt', width: 160, render: fmtDateTime },
    {
      title: '操作',
      width: 80,
      fixed: 'right',
      render: (_, r) => {
        const reason = denyReason(r)
        return (
          <Tooltip title={reason}>
            <Button type="link" size="small" danger disabled={Boolean(reason)} onClick={() => remove([r.id])}>
              移出
            </Button>
          </Tooltip>
        )
      },
    },
  ]

  return (
    <>
      <Alert
        className="mb-4"
        type="info"
        showIcon
        title="修改成员资料、密码或角色请联系平台管理员；企业管理员与自己不能在此移出。"
      />
      <PageTable<Member>
        queryKey={tenantUserKeys.list(cid)}
        fetcher={api.list}
        columns={columns}
        rowKey="id"
        keywordPlaceholder="用户名 / 昵称 / 手机号"
        filters={[
          { name: 'role', placeholder: '企业角色', options: enumOptions(COMPANY_ROLE), width: 110 },
          { name: 'status', placeholder: '账号状态', options: enumOptions(ACTIVE_STATUS), width: 110 },
        ]}
        selectable={(r) => canRemoveMember(r, me.id)}
        toolbar={
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setCreating(true)}>
            创建用户
          </Button>
        }
        batchActions={(keys, _r, clear) => (
          <Button danger size="small" onClick={() => remove(keys, clear)}>
            批量移出
          </Button>
        )}
      />
      <MemberCreateDrawer open={creating} onClose={() => setCreating(false)} />
      <MemberDetailDrawer id={viewing} onClose={() => setViewing(null)} />
    </>
  )
}
