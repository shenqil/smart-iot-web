import { DeleteOutlined, EditOutlined, KeyOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Descriptions, Select, Tabs, Tag, Tooltip } from 'antd'
import type { Key } from 'react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { fetchAllPages } from '@/api/page'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'
import { DetailHeader } from '@/components/DetailHeader'
import { ACTIVE_STATUS, COMPANY_ROLE, EnumTag, ExpireTag, enumOptions, SYSTEM_ROLE } from '@/components/StatusTag'
import { type PageColumn, PageTable } from '@/components/table/PageTable'
import { useMe } from '@/hooks/session'
import { affectedText, confirmAction } from '@/lib/confirm'
import { fmtDateTime } from '@/lib/time'
import { type CompanyRole, type Membership, userApi, userKeys } from './api'
import { JoinCompanyModal } from './JoinCompanyModal'
import { ResetPasswordModal } from './ResetPasswordModal'
import { UserFormDrawer } from './UserFormDrawer'

const ROLE_OPTIONS = enumOptions(COMPANY_ROLE)

/** 用户详情 (FRONTEND_DESIGN §3.3)：所属企业 (改角色 / 移出 / 加入) + 基本信息 */
export default function UserDetailPage() {
  const id = Number(useParams().id)
  const me = useMe()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'companies'
  const [editing, setEditing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [joining, setJoining] = useState(false)
  const { data: u, isPending } = useQuery(userApi.detail(id))
  const self = id === me.id

  const joined = useQuery({
    queryKey: [...userKeys.memberships(id), 'all-ids'],
    queryFn: () => fetchAllPages((page, pageSize) => userApi.memberships(id, { page, pageSize })),
    enabled: joining,
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: userKeys.memberships(id) })
    qc.invalidateQueries({ queryKey: userKeys.detail(id) })
    qc.invalidateQueries({ queryKey: ['admin', 0, 'companies'] })
    if (self) qc.invalidateQueries({ queryKey: ['auth', 'companies'] })
  }

  const setRole = async (m: Membership, role: CompanyRole) => {
    try {
      await userApi.setRole(id, m.companyId, role)
      notify.success(`已设为 ${m.companyName} 的${COMPANY_ROLE[role].label}`)
      refresh()
    } catch (e) {
      handleGlobalError(e)
    }
  }

  const leave = (companyIds: Key[], clear?: () => void) =>
    confirmAction({
      title: `从 ${companyIds.length} 家企业移出该用户？`,
      okText: '移出',
      onOk: () => userApi.leave(id, companyIds as number[]),
      successText: affectedText('移出'),
      onDone: () => {
        clear?.()
        refresh()
      },
    })

  const remove = () =>
    confirmAction({
      title: `删除用户「${u?.username}」？`,
      content: '将同时移出其所属的全部企业。此操作不可恢复。',
      okText: '删除',
      onOk: () => userApi.remove([id]),
      successText: '用户已删除',
      onDone: () => {
        navigate('/admin/users', { replace: true })
        qc.removeQueries({ queryKey: userKeys.detail(id) })
        qc.invalidateQueries({ queryKey: userKeys.list })
      },
    })

  const columns: PageColumn<Membership>[] = [
    {
      title: '企业',
      dataIndex: 'companyName',
      sortField: 'companyName',
      render: (v, r) => <Link to={`/admin/companies/${r.companyId}`}>{v}</Link>,
    },
    { title: '企业状态', dataIndex: 'companyStatus', render: (v) => <EnumTag value={v} defs={ACTIVE_STATUS} /> },
    { title: '服务过期', dataIndex: 'companyExpiredAt', render: (v) => <ExpireTag value={v} /> },
    {
      title: '企业角色',
      dataIndex: 'role',
      sortField: 'role',
      width: 130,
      render: (v, r) => (
        <Select size="small" className="w-24" value={v} options={ROLE_OPTIONS} onChange={(role) => setRole(r, role)} />
      ),
    },
    { title: '加入时间', dataIndex: 'joinedAt', width: 160, sortField: 'joinedAt', render: fmtDateTime },
    {
      title: '操作',
      width: 80,
      render: (_, r) => (
        <Button type="link" size="small" danger onClick={() => leave([r.companyId])}>
          移出
        </Button>
      ),
    },
  ]

  return (
    <>
      <DetailHeader
        loading={isPending}
        backTo="/admin/users"
        title={u && (u.nickname ? `${u.nickname} (${u.username})` : u.username)}
        tags={
          u && (
            <>
              <EnumTag value={u.systemRole} defs={SYSTEM_ROLE} />
              <EnumTag value={u.status} defs={ACTIVE_STATUS} />
              {u.companyCount === 0 && <Tag color="orange">公海用户</Tag>}
              {self && <Tag>我</Tag>}
            </>
          )
        }
        subtitle={u && [u.phone, `所属企业 ${u.companyCount} 家`].filter(Boolean).join(' · ')}
        extra={
          <>
            <Button icon={<EditOutlined />} disabled={!u} onClick={() => setEditing(true)}>
              编辑
            </Button>
            <Button icon={<KeyOutlined />} disabled={!u} onClick={() => setResetting(true)}>
              重置密码
            </Button>
            <Tooltip title={self ? '不能删除自己' : undefined}>
              <Button danger icon={<DeleteOutlined />} disabled={!u || self} onClick={remove}>
                删除
              </Button>
            </Tooltip>
          </>
        }
      />
      {/* 表格页签撑满剩余高度 (表格内滚动)；基本信息保持自然高度 */}
      <Card variant="borderless" className={tab === 'info' ? undefined : 'layout-fill'}>
        <Tabs
          className="layout-fill"
          activeKey={tab}
          onChange={(k) => setParams(k === 'companies' ? {} : { tab: k }, { replace: true })}
          destroyOnHidden
          items={[
            {
              key: 'companies',
              label: `所属企业${u ? ` (${u.companyCount})` : ''}`,
              children: (
                <PageTable<Membership>
                  bare
                  prefix="c_"
                  queryKey={userKeys.memberships(id)}
                  fetcher={(q) => userApi.memberships(id, q)}
                  columns={columns}
                  rowKey="companyId"
                  keywordPlaceholder="企业名称"
                  defaultSort="-joinedAt"
                  toolbar={
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setJoining(true)}>
                      加入企业
                    </Button>
                  }
                  batchActions={(keys, _r, clear) => (
                    <Button danger size="small" onClick={() => leave(keys, clear)}>
                      批量移出
                    </Button>
                  )}
                />
              ),
            },
            {
              key: 'info',
              label: '基本信息',
              children: u && (
                <Descriptions column={{ xs: 1, md: 2 }} bordered>
                  <Descriptions.Item label="用户名">{u.username}</Descriptions.Item>
                  <Descriptions.Item label="昵称">{u.nickname || '—'}</Descriptions.Item>
                  <Descriptions.Item label="手机号">{u.phone || '—'}</Descriptions.Item>
                  <Descriptions.Item label="系统角色">
                    <EnumTag value={u.systemRole} defs={SYSTEM_ROLE} />
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <EnumTag value={u.status} defs={ACTIVE_STATUS} />
                  </Descriptions.Item>
                  <Descriptions.Item label="所属企业">{u.companyCount} 家</Descriptions.Item>
                  <Descriptions.Item label="创建时间">{fmtDateTime(u.createdAt)}</Descriptions.Item>
                  <Descriptions.Item label="更新时间">{fmtDateTime(u.updatedAt)}</Descriptions.Item>
                </Descriptions>
              ),
            },
          ]}
        />
      </Card>
      <UserFormDrawer open={editing} user={u} onClose={() => setEditing(false)} />
      <ResetPasswordModal user={resetting && u ? u : null} onClose={() => setResetting(false)} />
      <JoinCompanyModal
        open={joining}
        userId={id}
        joinedIds={new Set((joined.data ?? []).map((m) => m.companyId))}
        onClose={() => setJoining(false)}
        onDone={refresh}
      />
    </>
  )
}
