import { useQuery } from '@tanstack/react-query'
import { Tooltip } from 'antd'
import { fetchAllPages } from '@/api/page'
import { SiteMap } from '@/components/map/SiteMap'
import { EnumTag, enumOptions, SITE_STATUS } from '@/components/StatusTag'
import { type PageColumn, PageTable } from '@/components/table/PageTable'
import { joinAddress } from '@/lib/address'
import { fmtDateTime } from '@/lib/time'
import { companyApi, companyKeys, type SiteRow } from './api'

/** 企业详情 · 园区 (平台只读，园区由企业管理员维护) */
export function CompanySitesTab({ companyId }: { companyId: number }) {
  const all = useQuery({
    queryKey: [...companyKeys.sites(companyId), 'all'],
    queryFn: () => fetchAllPages((page, pageSize) => companyApi.sites(companyId, { page, pageSize, sort: 'name' })),
  })

  const columns: PageColumn<SiteRow>[] = [
    { title: '园区', dataIndex: 'name', sortField: 'name' },
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
          <Tooltip title="企业管理员可在园区编辑中地图选点">
            <span className="text-fg-tertiary">未定位</span>
          </Tooltip>
        ),
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 160, sortField: 'createdAt', render: fmtDateTime },
  ]

  return (
    <div className="space-y-4">
      <SiteMap height={280} sites={all.data ?? []} />
      <PageTable<SiteRow>
        bare
        prefix="s_"
        queryKey={companyKeys.sites(companyId)}
        fetcher={(q) => companyApi.sites(companyId, q)}
        columns={columns}
        rowKey="id"
        keywordPlaceholder="名称 / 地址"
        defaultSort="name"
        filters={[{ name: 'status', placeholder: '状态', options: enumOptions(SITE_STATUS), width: 110 }]}
      />
    </div>
  )
}
