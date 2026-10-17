import { useQuery } from '@tanstack/react-query'
import { Button, Card, Col, Row, Space, Statistic } from 'antd'
import { Link } from 'react-router'
import { api, companyHeader, unwrap } from '@/api/client'
import { useCompanyId } from '@/hooks/session'

/** 企业概览 (M0：本企业汇总；M3 补充园区分布地图) */
export default function TenantOverview() {
  const companyId = useCompanyId()
  const { data, isPending } = useQuery({
    queryKey: ['tenant', companyId, 'company'],
    queryFn: () => unwrap(api.GET('/api/v1/tenant/company', { params: { header: companyHeader(companyId) } })),
  })
  return (
    <Space orientation="vertical" size={16} className="w-full">
      <Row gutter={[16, 16]}>
        {[
          ['园区', data?.siteCount],
          ['设备', data?.deviceCount],
          ['成员', data?.memberCount],
        ].map(([title, value]) => (
          <Col key={String(title)} xs={24} sm={8}>
            <Card>
              <Statistic title={title} value={value ?? '—'} loading={isPending} />
            </Card>
          </Col>
        ))}
      </Row>
      <Card title="快捷入口">
        <Space wrap>
          <Link to="sites">
            <Button>园区管理</Button>
          </Link>
          <Link to="devices">
            <Button>设备管理</Button>
          </Link>
          <Link to="users">
            <Button>成员管理</Button>
          </Link>
          <Link to={`/app/${companyId}/monitor`}>
            <Button type="primary">进入数据使用端</Button>
          </Link>
          <Link to={`/screen/${companyId}`} target="_blank">
            <Button>打开大屏</Button>
          </Link>
        </Space>
      </Card>
    </Space>
  )
}
