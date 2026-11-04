import {
  AppstoreOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  FundProjectionScreenOutlined,
  PlusOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Statistic } from 'antd'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { SiteMap } from '@/components/map/SiteMap'
import { tenantSitesAllQuery } from '@/features/site/tenant/api'
import { useCompanyId } from '@/hooks/session'
import { tenantCompanyQuery } from './api'

/** 企业概览 (FRONTEND_DESIGN §4.1)：三个数 + 园区分布地图 + 快捷入口 */
export default function TenantOverview() {
  const cid = useCompanyId()
  const navigate = useNavigate()
  const base = `/tenant/${cid}`
  const company = useQuery(tenantCompanyQuery(cid))
  const sites = useQuery(tenantSitesAllQuery(cid))
  const c = company.data

  const stats: { title: string; value?: number; icon: ReactNode; to: string }[] = [
    { title: '园区', value: c?.siteCount, icon: <EnvironmentOutlined />, to: 'sites' },
    { title: '设备', value: c?.deviceCount, icon: <AppstoreOutlined />, to: 'devices' },
    { title: '成员', value: c?.memberCount, icon: <TeamOutlined />, to: 'users' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.title} variant="borderless" hoverable onClick={() => navigate(`${base}/${s.to}`)}>
            <Statistic
              title={s.title}
              value={s.value ?? '—'}
              loading={company.isPending}
              prefix={<span className="mr-1 text-primary">{s.icon}</span>}
            />
          </Card>
        ))}
      </div>
      <Card variant="borderless" title="快捷入口">
        <div className="flex flex-wrap gap-2">
          <Link to={`${base}/sites?create=1`}>
            <Button icon={<PlusOutlined />}>新建园区</Button>
          </Link>
          <Link to={`${base}/devices?create=1`}>
            <Button icon={<PlusOutlined />}>登记设备</Button>
          </Link>
          <Link to={`${base}/users?create=1`}>
            <Button icon={<UserAddOutlined />}>添加成员</Button>
          </Link>
          <Link to={`/app/${cid}/monitor`}>
            <Button type="primary" icon={<DashboardOutlined />}>
              进入数据使用端
            </Button>
          </Link>
          <Link to={`/screen/${cid}`} target="_blank">
            <Button icon={<FundProjectionScreenOutlined />}>打开大屏</Button>
          </Link>
        </div>
      </Card>
      <Card
        variant="borderless"
        title="园区分布"
        extra={<Link to={`${base}/sites`}>全部园区 ›</Link>}
        loading={sites.isPending}
      >
        <SiteMap height={420} sites={sites.data ?? []} detailPath={(id) => `${base}/sites/${id}`} />
      </Card>
    </div>
  )
}
