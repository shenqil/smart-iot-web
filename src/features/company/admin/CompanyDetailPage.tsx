import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, Button, Card, Descriptions, Statistic, Tabs } from 'antd'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { DetailHeader } from '@/components/DetailHeader'
import { ACTIVE_STATUS, EnumTag, ExpireTag } from '@/components/StatusTag'
import { confirmAction } from '@/lib/confirm'
import { fmtDateTime } from '@/lib/time'
import { companyApi, companyKeys } from './api'
import { CompanyDevicesTab } from './CompanyDevicesTab'
import { CompanyFormDrawer } from './CompanyFormDrawer'
import { CompanyMembersTab } from './CompanyMembersTab'
import { CompanySitesTab } from './CompanySitesTab'

type TabKey = 'info' | 'members' | 'devices' | 'sites'

/** 企业详情 (FRONTEND_DESIGN §3.2)：基本信息 / 成员 / 设备 / 园区 */
export default function CompanyDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as TabKey) || 'info'
  const [editing, setEditing] = useState(false)
  const { data: c, isPending } = useQuery(companyApi.detail(id))

  const switchTab = (key: string) => setParams(key === 'info' ? {} : { tab: key }, { replace: true })

  const remove = () =>
    confirmAction({
      title: `删除企业「${c?.name}」？`,
      content: '将同时删除企业的园区、成员关系与设备授权；用户与设备本身保留 (回到公海)。此操作不可恢复。',
      okText: '删除',
      onOk: () => companyApi.remove([id]),
      successText: '企业已删除',
      onDone: () => {
        // 先离开详情页再刷新列表，避免已删除的详情被重新请求 (404)
        navigate('/admin/companies', { replace: true })
        qc.removeQueries({ queryKey: companyKeys.detail(id) })
        qc.invalidateQueries({ queryKey: companyKeys.list })
      },
    })

  const stats: { key: TabKey; title: string; value?: number }[] = [
    { key: 'members', title: '成员', value: c?.memberCount },
    { key: 'devices', title: '已授权设备', value: c?.deviceCount },
    { key: 'sites', title: '园区', value: c?.siteCount },
  ]

  return (
    <>
      <DetailHeader
        loading={isPending}
        backTo="/admin/companies"
        title={
          <span className="flex items-center gap-2">
            <Avatar shape="square" size={32} src={c?.logo || undefined} className="bg-primary!">
              {c?.name.slice(0, 1)}
            </Avatar>
            {c?.name}
          </span>
        }
        tags={
          c && (
            <>
              <EnumTag value={c.status} defs={ACTIVE_STATUS} />
              <span className="text-sm">
                服务期：
                <ExpireTag value={c.expiredAt} />
              </span>
            </>
          )
        }
        subtitle={c && [c.contactPerson, c.contactPhone, c.contactEmail].filter(Boolean).join(' · ')}
        extra={
          <>
            <Button icon={<EditOutlined />} onClick={() => setEditing(true)} disabled={!c}>
              编辑
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={remove} disabled={!c}>
              删除
            </Button>
          </>
        }
      />
      <div className="mb-4 grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card
            key={s.key}
            variant="borderless"
            hoverable
            onClick={() => switchTab(s.key)}
            className={tab === s.key ? 'ring-2 ring-primary' : ''}
          >
            <Statistic title={s.title} value={s.value ?? '—'} loading={isPending} />
          </Card>
        ))}
      </div>
      <Card variant="borderless">
        <Tabs
          activeKey={tab}
          onChange={switchTab}
          destroyOnHidden
          items={[
            {
              key: 'info',
              label: '基本信息',
              children: c && (
                <Descriptions column={{ xs: 1, md: 2 }} bordered size="middle">
                  <Descriptions.Item label="企业全称">{c.name}</Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <EnumTag value={c.status} defs={ACTIVE_STATUS} />
                  </Descriptions.Item>
                  <Descriptions.Item label="联系人">{c.contactPerson || '—'}</Descriptions.Item>
                  <Descriptions.Item label="联系电话">{c.contactPhone || '—'}</Descriptions.Item>
                  <Descriptions.Item label="联系邮箱">{c.contactEmail || '—'}</Descriptions.Item>
                  <Descriptions.Item label="服务过期时间">
                    <ExpireTag value={c.expiredAt} />
                  </Descriptions.Item>
                  <Descriptions.Item label="地址" span="filled">
                    {c.address || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="描述" span="filled">
                    <span className="whitespace-pre-wrap">{c.description || '—'}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">{fmtDateTime(c.createdAt)}</Descriptions.Item>
                  <Descriptions.Item label="更新时间">{fmtDateTime(c.updatedAt)}</Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'members',
              label: `成员${c ? ` (${c.memberCount})` : ''}`,
              children: <CompanyMembersTab companyId={id} />,
            },
            {
              key: 'devices',
              label: `设备${c ? ` (${c.deviceCount})` : ''}`,
              children: <CompanyDevicesTab companyId={id} />,
            },
            {
              key: 'sites',
              label: `园区${c ? ` (${c.siteCount})` : ''}`,
              children: <CompanySitesTab companyId={id} />,
            },
          ]}
        />
      </Card>
      <CompanyFormDrawer open={editing} company={c} onClose={() => setEditing(false)} />
    </>
  )
}
