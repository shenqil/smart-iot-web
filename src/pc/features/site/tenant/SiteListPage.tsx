import { DeleteOutlined, EditOutlined, EnvironmentOutlined, PlusOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Card, Space, Tooltip } from 'antd'
import type { Key, MouseEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { EnumTag, enumOptions, SITE_STATUS } from '@/components/StatusTag'
import { type PageColumn, PageTable } from '@/components/table/PageTable'
import { useCompanyId } from '@/hooks/session'
import { joinAddress } from '@/lib/address'
import { affectedText, confirmAction } from '@/lib/confirm'
import { invalidateTenant } from '@/lib/tenant'
import { fmtDateTime } from '@/lib/time'
import { type Site, tenantSiteApi, tenantSiteKeys } from './api'
import { SiteCover } from './SiteCover'
import { SiteFormDrawer } from './SiteFormDrawer'

export const SITE_DELETE_TIP = '只解除园区下的设备挂载，设备仍属于本企业；未挂载任何园区的设备在数据使用端不可见。'

/** 园区列表 (FRONTEND_DESIGN §4.2)：卡片 / 表格切换，关键字匹配名称与地址 */
export default function SiteListPage() {
  const cid = useCompanyId()
  const api = tenantSiteApi(cid)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<Site | 'new' | null>(null)
  const detailPath = (id: number) => `/tenant/${cid}/sites/${id}`

  // 概览页"新建园区"快捷入口：?create=1
  useEffect(() => {
    if (params.get('create') !== '1') return
    setEditing('new')
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
      title: `删除 ${ids.length} 个园区？`,
      content: SITE_DELETE_TIP,
      okText: '删除',
      onOk: () => api.remove(ids as number[]),
      successText: affectedText('删除'),
      onDone: () => {
        clear?.()
        invalidateTenant(qc, cid, 'sites', 'devices', 'company')
      },
    })

  const stop = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation()
    fn()
  }

  const columns: PageColumn<Site>[] = [
    {
      title: '园区',
      dataIndex: 'name',
      sortField: 'name',
      render: (v, r) => <Link to={detailPath(r.id)}>{v}</Link>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      sortField: 'status',
      render: (v) => <EnumTag value={v} defs={SITE_STATUS} />,
    },
    { title: '地址', render: (_, r) => joinAddress(r) || '—' },
    {
      title: '坐标',
      render: (_, r) =>
        r.longitude != null ? (
          <span className="font-mono text-fg-secondary text-xs">
            {r.longitude.toFixed(6)}, {r.latitude?.toFixed(6)}
          </span>
        ) : (
          <span className="text-fg-tertiary">未定位</span>
        ),
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 160, sortField: 'createdAt', render: fmtDateTime },
    {
      title: '操作',
      width: 200,
      fixed: 'right',
      render: (_, r) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => navigate(detailPath(r.id))}>
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
      <PageTable<Site>
        queryKey={tenantSiteKeys.list(cid)}
        fetcher={api.list}
        columns={columns}
        rowKey="id"
        keywordPlaceholder="名称 / 地址"
        defaultSort="name"
        pageSize={24}
        filters={[{ name: 'status', placeholder: '状态', options: enumOptions(SITE_STATUS), width: 110 }]}
        toolbar={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>
            新建园区
          </Button>
        }
        batchActions={(keys, _rows, clear) => (
          <Button danger size="small" onClick={() => remove(keys, clear)}>
            批量删除
          </Button>
        )}
        cardView={{
          defaultView: 'card',
          minWidth: 260,
          render: (r) => (
            <Card
              hoverable
              size="small"
              className="overflow-hidden"
              cover={<SiteCover src={r.coverImage} />}
              onClick={() => navigate(detailPath(r.id))}
              actions={[
                <Tooltip key="edit" title="编辑">
                  <EditOutlined aria-label="编辑" onClick={stop(() => setEditing(r))} />
                </Tooltip>,
                <Tooltip key="delete" title="删除">
                  <DeleteOutlined aria-label="删除" className="text-danger!" onClick={stop(() => remove([r.id]))} />
                </Tooltip>,
              ]}
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
                <EnumTag value={r.status} defs={SITE_STATUS} />
              </div>
              <div className="mt-1 truncate text-fg-secondary text-xs">
                <EnvironmentOutlined /> {joinAddress(r) || '未填写地址'}
              </div>
              <div className="mt-1 text-fg-tertiary text-xs">
                {r.longitude != null ? '已定位' : '未定位'} · {r.images?.length ?? 0} 张图片
              </div>
            </Card>
          ),
        }}
      />
      <SiteFormDrawer
        open={editing !== null}
        site={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={(id) => editing === 'new' && navigate(detailPath(id))}
      />
    </>
  )
}
