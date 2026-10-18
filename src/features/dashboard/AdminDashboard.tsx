import { AppstoreOutlined, BankOutlined, CloudServerOutlined, TeamOutlined, UserAddOutlined } from '@ant-design/icons'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Avatar, Card, Empty, Skeleton, Statistic, Tag } from 'antd'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { api, unwrap } from '@/api/client'
import { ExpireTag, OnlineTag } from '@/components/StatusTag'
import { useDeviceTypes } from '@/features/dict/api'
import { dayjs, fmtDateTime } from '@/lib/time'

interface StatDef {
  key: string
  title: string
  icon: ReactNode
  to: string
  fn: () => Promise<{ data?: { totalCount: number } }>
}

const STATS: StatDef[] = [
  {
    key: 'companies',
    title: '企业',
    icon: <BankOutlined />,
    to: '/admin/companies',
    fn: () => api.GET('/api/v1/admin/companies', { params: { query: { pageSize: 1 } } }),
  },
  {
    key: 'users',
    title: '用户',
    icon: <TeamOutlined />,
    to: '/admin/users',
    fn: () => api.GET('/api/v1/admin/users', { params: { query: { pageSize: 1 } } }),
  },
  {
    key: 'unassignedUsers',
    title: '公海用户',
    icon: <UserAddOutlined />,
    to: '/admin/users?unassigned=true',
    fn: () => api.GET('/api/v1/admin/users', { params: { query: { pageSize: 1, unassigned: true } } }),
  },
  {
    key: 'devices',
    title: '设备',
    icon: <AppstoreOutlined />,
    to: '/admin/devices',
    fn: () => api.GET('/api/v1/admin/devices', { params: { query: { pageSize: 1 } } }),
  },
  {
    key: 'unassignedDevices',
    title: '公海设备',
    icon: <CloudServerOutlined />,
    to: '/admin/devices?unassigned=true',
    fn: () => api.GET('/api/v1/admin/devices', { params: { query: { pageSize: 1, unassigned: true } } }),
  },
]

/** 简单列表 (antd 6.6 起 List 已废弃) */
function SimpleList<T>({
  loading,
  data,
  empty,
  rowKey,
  render,
}: {
  loading: boolean
  data: T[]
  empty: string
  rowKey: (r: T) => string | number
  render: (r: T) => ReactNode
}) {
  if (loading) return <Skeleton active paragraph={{ rows: 4 }} />
  if (!data.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} />
  return (
    <ul className="m-0 list-none divide-y divide-line p-0">
      {data.map((r) => (
        <li key={rowKey(r)} className="flex items-center gap-3 py-3">
          {render(r)}
        </li>
      ))}
    </ul>
  )
}

/** 平台工作台 (FRONTEND_DESIGN §3.1)；后端暂无统计接口，数字取各列表 totalCount */
export default function AdminDashboard() {
  const types = useDeviceTypes()
  const stats = useQueries({
    queries: STATS.map((s) => ({
      queryKey: ['admin', 0, 'dashboard', s.key],
      queryFn: async () => (await unwrap(s.fn())).totalCount,
    })),
  })

  // 即将过期 (30 天内) 与已过期的启用企业：按过期时间升序 (不过期的排在最后)
  const expiring = useQuery({
    queryKey: ['admin', 0, 'dashboard', 'expiring'],
    queryFn: async () => {
      const r = await unwrap(
        api.GET('/api/v1/admin/companies', {
          params: { query: { sort: 'expiredAt', status: 'active', pageSize: 50 } },
        }),
      )
      const limit = dayjs().add(30, 'day')
      return r.records.filter((c) => c.expiredAt && dayjs(c.expiredAt).isBefore(limit))
    },
  })
  const recent = useQuery({
    queryKey: ['admin', 0, 'dashboard', 'recent-devices'],
    queryFn: () => unwrap(api.GET('/api/v1/admin/devices', { params: { query: { sort: '-createdAt', pageSize: 8 } } })),
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {STATS.map((s, i) => (
          <Link key={s.key} to={s.to}>
            <Card variant="borderless" hoverable>
              <div className="flex items-center gap-4">
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary-bg text-primary text-xl">
                  {s.icon}
                </span>
                <Statistic title={s.title} value={stats[i].data ?? '—'} loading={stats[i].isPending} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          variant="borderless"
          title="即将过期 / 已过期的企业"
          extra={<Link to="/admin/companies?sort=expiredAt">全部</Link>}
        >
          <SimpleList
            loading={expiring.isPending}
            data={expiring.data ?? []}
            empty="30 天内没有到期的企业"
            rowKey={(c) => c.id}
            render={(c) => (
              <>
                <Avatar shape="square" src={c.logo || undefined} className="shrink-0 bg-primary!">
                  {c.name.slice(0, 1)}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Link to={`/admin/companies/${c.id}`}>{c.name}</Link>
                  <div className="text-fg-tertiary text-sm">
                    {[c.contactPerson, c.contactPhone].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                <ExpireTag value={c.expiredAt} />
              </>
            )}
          />
        </Card>
        <Card variant="borderless" title="最近登记的设备" extra={<Link to="/admin/devices">全部</Link>}>
          <SimpleList
            loading={recent.isPending}
            data={recent.data?.records ?? []}
            empty="暂无设备"
            rowKey={(d) => d.id}
            render={(d) => (
              <>
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <Link to={`/admin/devices/${d.id}`}>{d.name}</Link>
                    <OnlineTag online={d.online} />
                  </span>
                  <div className="text-fg-tertiary text-sm">
                    <span className="font-mono">{d.deviceSn}</span>{' '}
                    <Tag className="ml-1">{types.nameOf(d.deviceTypeId)}</Tag>
                  </div>
                </div>
                <span className="text-fg-tertiary text-sm">{fmtDateTime(d.createdAt)}</span>
              </>
            )}
          />
        </Card>
      </div>
    </div>
  )
}
