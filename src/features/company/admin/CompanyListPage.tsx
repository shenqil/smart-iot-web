import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Avatar, Button, Space } from 'antd'
import type { Key } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ACTIVE_STATUS, EnumTag, ExpireTag, enumOptions } from '@/components/StatusTag'
import { type PageColumn, PageTable } from '@/components/table/PageTable'
import { affectedText, confirmAction } from '@/lib/confirm'
import { fmtDateTime } from '@/lib/time'
import { type Company, companyApi, companyKeys } from './api'
import { CompanyFormDrawer } from './CompanyFormDrawer'

/** 企业列表 (FRONTEND_DESIGN §3.2) */
export default function CompanyListPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [editing, setEditing] = useState<Company | 'new' | null>(null)

  const remove = (ids: Key[], clear?: () => void) =>
    confirmAction({
      title: `删除 ${ids.length} 家企业？`,
      content: '将同时删除企业的园区、成员关系与设备授权；用户与设备本身保留 (回到公海)。此操作不可恢复。',
      okText: '删除',
      onOk: () => companyApi.remove(ids as number[]),
      successText: affectedText('删除'),
      onDone: () => {
        clear?.()
        qc.invalidateQueries({ queryKey: companyKeys.all })
      },
    })

  const columns: PageColumn<Company>[] = [
    {
      title: '企业',
      dataIndex: 'name',
      sortField: 'name',
      render: (v, r) => (
        <Link to={`/admin/companies/${r.id}`} className="flex items-center gap-2">
          <Avatar shape="square" size={28} src={r.logo || undefined} className="shrink-0 bg-primary!">
            {v.slice(0, 1)}
          </Avatar>
          <span>{v}</span>
        </Link>
      ),
    },
    { title: '联系人', dataIndex: 'contactPerson', render: (v) => v || '—' },
    { title: '联系电话', dataIndex: 'contactPhone', render: (v) => v || '—' },
    { title: '服务过期', dataIndex: 'expiredAt', sortField: 'expiredAt', render: (v) => <ExpireTag value={v} /> },
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
      width: 200,
      fixed: 'right',
      render: (_, r) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => navigate(`/admin/companies/${r.id}`)}>
            详情
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => setEditing(r)}>
            编辑
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => remove([r.id])}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageTable<Company>
        queryKey={companyKeys.list}
        fetcher={companyApi.list}
        columns={columns}
        rowKey="id"
        keywordPlaceholder="名称 / 联系人 / 电话"
        defaultSort="-createdAt"
        filters={[{ name: 'status', placeholder: '状态', options: enumOptions(ACTIVE_STATUS), width: 110 }]}
        toolbar={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>
            新建企业
          </Button>
        }
        batchActions={(keys, _rows, clear) => (
          <Button danger size="small" onClick={() => remove(keys, clear)}>
            批量删除
          </Button>
        )}
      />
      <CompanyFormDrawer
        open={editing !== null}
        company={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={(id) => editing === 'new' && navigate(`/admin/companies/${id}`)}
      />
    </>
  )
}
