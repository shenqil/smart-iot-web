import { DeleteOutlined, EditOutlined, KeyOutlined, PlusOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Space, Tag, Tooltip } from 'antd'
import type { Key } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ACTIVE_STATUS, EnumTag, enumOptions, SYSTEM_ROLE } from '@/components/StatusTag'
import { type PageColumn, PageTable } from '@/components/table/PageTable'
import { useMe } from '@/hooks/session'
import { affectedText, confirmAction } from '@/lib/confirm'
import { fmtDateTime } from '@/lib/time'
import { type User, userApi, userKeys } from './api'
import { ResetPasswordModal } from './ResetPasswordModal'
import { UserFormDrawer } from './UserFormDrawer'

/** 用户列表 (FRONTEND_DESIGN §3.3) */
export default function UserListPage() {
  const qc = useQueryClient()
  const me = useMe()
  const navigate = useNavigate()
  const [editing, setEditing] = useState<User | 'new' | null>(null)
  const [resetting, setResetting] = useState<User | null>(null)

  const remove = (ids: Key[], clear?: () => void) =>
    confirmAction({
      title: `删除 ${ids.length} 个用户？`,
      content: '将同时移出其所属的全部企业；操作记录与告警处理记录中的名称保留。此操作不可恢复。',
      okText: '删除',
      onOk: () => userApi.remove(ids as number[]),
      successText: affectedText('删除'),
      onDone: () => {
        clear?.()
        qc.invalidateQueries({ queryKey: userKeys.all })
      },
    })

  const columns: PageColumn<User>[] = [
    {
      title: '用户名',
      dataIndex: 'username',
      sortField: 'username',
      render: (v, r) => (
        <Space size={4}>
          <Link to={`/admin/users/${r.id}`}>{v}</Link>
          {r.id === me.id && <Tag>我</Tag>}
        </Space>
      ),
    },
    { title: '昵称', dataIndex: 'nickname', render: (v) => v || '—' },
    { title: '手机号', dataIndex: 'phone', render: (v) => v || '—' },
    {
      title: '系统角色',
      dataIndex: 'systemRole',
      sortField: 'systemRole',
      render: (v) => <EnumTag value={v} defs={SYSTEM_ROLE} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      sortField: 'status',
      render: (v) => <EnumTag value={v} defs={ACTIVE_STATUS} />,
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 160, sortField: 'createdAt', render: fmtDateTime },
    {
      title: '操作',
      width: 260,
      fixed: 'right',
      render: (_, r) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => navigate(`/admin/users/${r.id}`)}>
            详情
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => setEditing(r)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<KeyOutlined />} onClick={() => setResetting(r)}>
            重置密码
          </Button>
          <Tooltip title={r.id === me.id ? '不能删除自己' : undefined}>
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={r.id === me.id}
              onClick={() => remove([r.id])}
            >
              删除
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageTable<User>
        queryKey={userKeys.list}
        fetcher={userApi.list}
        columns={columns}
        rowKey="id"
        keywordPlaceholder="用户名 / 昵称 / 手机号"
        defaultSort="-createdAt"
        filters={[
          { name: 'systemRole', placeholder: '系统角色', options: enumOptions(SYSTEM_ROLE), width: 120 },
          { name: 'status', placeholder: '状态', options: enumOptions(ACTIVE_STATUS), width: 100 },
          {
            name: 'unassigned',
            type: 'boolean',
            placeholder: '企业归属',
            options: [{ value: true, label: '只看公海用户' }],
            width: 140,
          },
        ]}
        toolbar={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>
            新建用户
          </Button>
        }
        selectable={(r) => r.id !== me.id}
        batchActions={(keys, _r, clear) => (
          <Button danger size="small" onClick={() => remove(keys, clear)}>
            批量删除
          </Button>
        )}
      />
      <UserFormDrawer
        open={editing !== null}
        user={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={(id) => editing === 'new' && navigate(`/admin/users/${id}`)}
      />
      <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />
    </>
  )
}
