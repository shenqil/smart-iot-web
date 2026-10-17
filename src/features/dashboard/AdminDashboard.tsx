import { useQueries } from '@tanstack/react-query'
import { Card, Col, Row, Statistic } from 'antd'
import { api, unwrap } from '@/api/client'

/** 平台工作台 (M0：统计数字；M2 补充即将过期企业与最近设备) */
interface StatDef {
  key: string
  title: string
  fn: () => Promise<{ data?: { totalCount: number } }>
}

export default function AdminDashboard() {
  const defs: StatDef[] = [
    {
      key: 'companies',
      title: '企业',
      fn: () => api.GET('/api/v1/admin/companies', { params: { query: { pageSize: 1 } } }),
    },
    { key: 'users', title: '用户', fn: () => api.GET('/api/v1/admin/users', { params: { query: { pageSize: 1 } } }) },
    {
      key: 'unassignedUsers',
      title: '公海用户',
      fn: () => api.GET('/api/v1/admin/users', { params: { query: { pageSize: 1, unassigned: true } } }),
    },
    {
      key: 'devices',
      title: '设备',
      fn: () => api.GET('/api/v1/admin/devices', { params: { query: { pageSize: 1 } } }),
    },
    {
      key: 'unassignedDevices',
      title: '公海设备',
      fn: () => api.GET('/api/v1/admin/devices', { params: { query: { pageSize: 1, unassigned: true } } }),
    },
  ]
  const stats = useQueries({
    queries: defs.map((s) => ({
      queryKey: ['admin', 0, 'dashboard', s.key],
      queryFn: async () => ({ key: s.key, title: s.title, total: (await unwrap(s.fn())).totalCount }),
    })),
  })

  return (
    <Row gutter={[16, 16]}>
      {stats.map((q, i) => (
        <Col key={q.data?.key ?? `pending-${i}`} xs={12} md={8} xl={4}>
          <Card>
            <Statistic title={q.data?.title ?? '—'} value={q.data?.total ?? '—'} loading={q.isPending} />
          </Card>
        </Col>
      ))}
    </Row>
  )
}
