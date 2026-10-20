import { ExportOutlined, LinkOutlined, LogoutOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button } from 'antd'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useCompanyId } from '@/hooks/session'
import { confirmAction } from '@/lib/confirm'
import { invalidateTenant } from '@/lib/tenant'
import { tenantDeviceConfigApi } from '../config/api'
import { DeviceConfigPage } from '../config/DeviceConfigPage'
import { tenantDeviceApi, tenantDeviceKeys } from './api'
import { DEVICE_REMOVE_TIP } from './DeviceListPage'
import { DeviceSitesTab } from './DeviceSitesTab'

/** 企业 · 设备配置页 = 通用配置页 + 挂载园区页签 + 移出本企业 (FRONTEND_DESIGN §4.3) */
export default function DeviceDetailPage() {
  const cid = useCompanyId()
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const api = tenantDeviceApi(cid)
  const cfg = tenantDeviceConfigApi(cid)

  // 挂载园区数：为 0 时数据使用端看不到该设备 (已确认决策 #9)
  const mounted = useQuery({
    queryKey: [...tenantDeviceKeys.sites(cid, id), 'count'],
    queryFn: () => api.sites(id, { page: 1, pageSize: 1 }),
  })
  const siteCount = mounted.data?.totalCount
  const onSitesTab = params.get('tab') === 'sites'

  return (
    <DeviceConfigPage
      cfg={cfg}
      id={id}
      backTo={`/tenant/${cid}/devices`}
      notice={
        <div className="mb-4 space-y-2">
          {siteCount === 0 && !onSitesTab && (
            <Alert
              type="warning"
              showIcon
              title="该设备未挂载任何园区，数据使用端看不到它"
              action={
                <Button
                  size="small"
                  type="primary"
                  icon={<LinkOutlined />}
                  onClick={() => setParams({ tab: 'sites' }, { replace: true })}
                >
                  挂载园区
                </Button>
              }
            />
          )}
          <Alert type="info" showIcon closable title="设备配置在所有授权企业间共享，修改会影响其他企业。" />
        </div>
      }
      headerExtra={(d) => (
        <>
          <Link to={`/tenant/${cid}/export?deviceId=${id}`}>
            <Button icon={<ExportOutlined />}>导出数据</Button>
          </Link>
          <Button
            danger
            icon={<LogoutOutlined />}
            onClick={() =>
              confirmAction({
                title: `将设备「${d.name}」移出本企业？`,
                content: DEVICE_REMOVE_TIP,
                okText: '移出',
                onOk: () => api.remove([id]),
                successText: '设备已移出本企业',
                onDone: () => {
                  navigate(`/tenant/${cid}/devices`, { replace: true })
                  // 先移除该设备自身的缓存，避免仍挂载的页面重新请求得到 404
                  qc.removeQueries({ queryKey: [...tenantDeviceKeys.all(cid), 'detail', id] })
                  qc.removeQueries({ queryKey: tenantDeviceKeys.sites(cid, id) })
                  qc.invalidateQueries({ queryKey: tenantDeviceKeys.list(cid) })
                  invalidateTenant(qc, cid, 'sites', 'company')
                },
              })
            }
          >
            移出本企业
          </Button>
        </>
      )}
      extraTabs={[
        {
          key: 'sites',
          label: `挂载园区${siteCount != null ? ` (${siteCount})` : ''}`,
          children: <DeviceSitesTab deviceId={id} />,
        },
      ]}
    />
  )
}
