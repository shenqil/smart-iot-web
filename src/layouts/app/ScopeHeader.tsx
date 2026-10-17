import { useQuery } from '@tanstack/react-query'
import { Breadcrumb, Tag } from 'antd'
import { Link } from 'react-router'
import { appSiteDevicesQuery } from '@/features/device/api'
import { appSitesQuery } from '@/features/site/api'
import { useCompanyId, useCurrentCompany } from '@/hooks/session'
import { useScope } from './useScope'

/** 工作区顶部：企业 › 园区 › 设备 (可点回上一级) */
export function ScopeHeader() {
  const companyId = useCompanyId()
  const company = useCurrentCompany()
  const { siteId, deviceId } = useScope()
  const sites = useQuery(appSitesQuery(companyId))
  const devices = useQuery({ ...appSiteDevicesQuery(companyId, siteId ?? 0), enabled: Boolean(siteId) })
  const site = sites.data?.find((s) => s.id === siteId)
  const device = devices.data?.find((d) => d.id === deviceId)

  const items = [{ key: 'c', title: <Link to={{ search: '' }}>{company?.name ?? '企业'}</Link> }]
  if (siteId)
    items.push({ key: 's', title: <Link to={{ search: `?siteId=${siteId}` }}>{site?.name ?? `园区 ${siteId}`}</Link> })
  if (deviceId) items.push({ key: 'd', title: <span>{device?.name ?? `设备 ${deviceId}`}</span> })

  return (
    <div className="mb-4 flex items-center gap-3">
      <Breadcrumb items={items} />
      {device && <Tag color={device.online ? 'success' : 'default'}>{device.online ? '● 在线' : '○ 离线'}</Tag>}
    </div>
  )
}

/** 当前范围的文字描述 (占位页使用) */
export function useScopeLabel() {
  const { siteId, deviceId } = useScope()
  return deviceId ? '设备' : siteId ? '园区' : '企业'
}
