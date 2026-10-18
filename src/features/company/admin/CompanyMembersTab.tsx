import { PlusOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Select, Tag } from 'antd'
import type { Key } from 'react'
import { useState } from 'react'
import { Link } from 'react-router'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'
import { ACTIVE_STATUS, COMPANY_ROLE, EnumTag, enumOptions } from '@/components/StatusTag'
import { type PageColumn, PageTable } from '@/components/table/PageTable'
import { RelationModal } from '@/components/table/RelationModal'
import { affectedText, confirmAction } from '@/lib/confirm'
import { fmtDateTime } from '@/lib/time'
import { companyApi, companyKeys, type Member, type UserRow } from './api'

const ROLE_OPTIONS = enumOptions(COMPANY_ROLE)

/** 企业详情 · 成员：分配成员 (含角色)、改角色、批量移出 */
export function CompanyMembersTab({ companyId }: { companyId: number }) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const refresh = () => {
    qc.invalidateQueries({ queryKey: companyKeys.members(companyId) })
    qc.invalidateQueries({ queryKey: companyKeys.detail(companyId) })
    qc.invalidateQueries({ queryKey: ['admin', 0, 'users'] })
  }

  const setRole = async (m: Member, role: 'admin' | 'user') => {
    try {
      await companyApi.setRole(companyId, m.id, role)
      notify.success(`已将 ${m.nickname || m.username} 设为${COMPANY_ROLE[role].label}`)
      refresh()
    } catch (e) {
      handleGlobalError(e)
    }
  }

  const remove = (ids: Key[], clear?: () => void) =>
    confirmAction({
      title: `移出 ${ids.length} 名成员？`,
      content: '只解除与本企业的关系，用户账号保留。',
      okText: '移出',
      onOk: () => companyApi.removeMembers(companyId, ids as number[]),
      successText: affectedText('移出'),
      onDone: () => {
        clear?.()
        refresh()
      },
    })

  const columns: PageColumn<Member>[] = [
    {
      title: '用户名',
      dataIndex: 'username',
      sortField: 'username',
      render: (v, r) => <Link to={`/admin/users/${r.id}`}>{v}</Link>,
    },
    { title: '昵称', dataIndex: 'nickname', render: (v) => v || '—' },
    { title: '手机号', dataIndex: 'phone', render: (v) => v || '—' },
    {
      title: '企业角色',
      dataIndex: 'role',
      sortField: 'role',
      width: 130,
      render: (v, r) => (
        <Select size="small" className="w-24" value={v} options={ROLE_OPTIONS} onChange={(role) => setRole(r, role)} />
      ),
    },
    {
      title: '账号状态',
      dataIndex: 'status',
      width: 90,
      render: (v, r) => (
        <>
          <EnumTag value={v} defs={ACTIVE_STATUS} />
          {r.systemRole === 'admin' && <Tag color="purple">平台管理员</Tag>}
        </>
      ),
    },
    { title: '加入时间', dataIndex: 'joinedAt', width: 160, sortField: 'joinedAt', render: fmtDateTime },
    {
      title: '操作',
      width: 80,
      render: (_, r) => (
        <Button type="link" size="small" danger onClick={() => remove([r.id])}>
          移出
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageTable<Member>
        bare
        prefix="m_"
        queryKey={companyKeys.members(companyId)}
        fetcher={(q) => companyApi.members(companyId, q)}
        columns={columns}
        rowKey="id"
        keywordPlaceholder="用户名 / 昵称 / 手机号"
        defaultSort="-joinedAt"
        filters={[
          { name: 'role', placeholder: '企业角色', options: ROLE_OPTIONS, width: 110 },
          { name: 'status', placeholder: '账号状态', options: enumOptions(ACTIVE_STATUS), width: 110 },
        ]}
        toolbar={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAdding(true)}>
            添加成员
          </Button>
        }
        batchActions={(keys, _r, clear) => (
          <Button danger size="small" onClick={() => remove(keys, clear)}>
            批量移出
          </Button>
        )}
      />
      <RelationModal<UserRow>
        open={adding}
        title="添加成员"
        queryKey={companyKeys.members(companyId)}
        fetchAvailable={(q) => companyApi.availableUsers(companyId, q)}
        rowKey={(r) => r.id}
        keywordPlaceholder="搜索用户名 / 昵称 / 手机号"
        label={(r) => (
          <span>
            {r.username}
            {r.nickname && <span className="text-fg-tertiary"> · {r.nickname}</span>}
          </span>
        )}
        columns={[
          { title: '用户名', dataIndex: 'username' },
          { title: '昵称', dataIndex: 'nickname', render: (v) => v || '—' },
          { title: '手机号', dataIndex: 'phone', render: (v) => v || '—' },
          { title: '状态', dataIndex: 'status', render: (v) => <EnumTag value={v} defs={ACTIVE_STATUS} /> },
        ]}
        roles={{ options: ROLE_OPTIONS, defaultValue: 'user' }}
        okText="添加"
        onConfirm={async (items) => {
          const r = await companyApi.assignMembers(
            companyId,
            items.map((i) => ({ userId: i.key as number, role: (i.role ?? 'user') as 'admin' | 'user' })),
          )
          notify.success(affectedText('添加')(r))
          refresh()
        }}
        onClose={() => setAdding(false)}
      />
    </>
  )
}
