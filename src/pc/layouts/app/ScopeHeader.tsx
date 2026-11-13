import { useQuery } from '@tanstack/react-query'
import { Breadcrumb, Tag } from 'antd'
import { Link } from 'react-router'
import { OnlineTag } from '@/components/StatusTag'
import { scopedUnprocessedCountQuery } from '@/features/alarm/api'
import { appSiteDevicesQuery } from '@/features/device/api'
import { useDeviceTypes } from '@/features/dict/api'
import { appSitesQuery } from '@/features/site/api'
import { isVideoDeviceType } from '@/features/telemetry/lib/realtime'
import { useCompanyId, useCurrentCompany } from '@/hooks/session'
import { useScope } from './useScope'

export interface ScopeHeaderProps {
  showStatus?: boolean
  /** 设备信息卡片是否在可视区域中；若已滚出视口，右侧浮现简要信息 */
  heroVisible?: boolean
  /** 点击简要信息时回到顶部 */
  onScrollToTop?: () => void
}

/** 工作区顶部：企业 › 园区 › 设备 (固定在上方，滚动时右侧浮现设备摘要) */
export function ScopeHeader({ showStatus = true, heroVisible = true, onScrollToTop }: ScopeHeaderProps) {
  const companyId = useCompanyId()
  const company = useCurrentCompany()
  const { siteId, deviceId } = useScope()
  const types = useDeviceTypes()
  const sites = useQuery(appSitesQuery(companyId))
  const devices = useQuery({ ...appSiteDevicesQuery(companyId, siteId ?? 0), enabled: Boolean(siteId) })
  const site = sites.data?.find((s) => s.id === siteId)
  const device = devices.data?.find((d) => d.id === deviceId)
  const type = device?.deviceTypeId != null ? types.byId.get(device.deviceTypeId) : undefined
  const isVideo = isVideoDeviceType(type?.name)

  const { data: alarm } = useQuery({
    ...scopedUnprocessedCountQuery(companyId, { deviceId: deviceId ?? 0 }),
    enabled: Boolean(deviceId && !isVideo),
  })
  const alarmCount = !isVideo && alarm ? (alarm.capped ? '99+' : String(alarm.count)) : null

  const items = [{ key: 'c', title: <Link to={{ search: '' }}>{company?.name ?? '企业'}</Link> }]
  if (siteId)
    items.push({ key: 's', title: <Link to={{ search: `?siteId=${siteId}` }}>{site?.name ?? `园区 ${siteId}`}</Link> })
  if (deviceId) items.push({ key: 'd', title: <span>{device?.name ?? `设备 ${deviceId}`}</span> })

  const showBrief = Boolean(deviceId && device && !heroVisible)

  return (
    <div className="flex flex-1 items-center justify-between gap-4 min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        <Breadcrumb items={items} />
        {showStatus && device && heroVisible && (
          <Tag color={device.online ? 'success' : 'default'}>{device.online ? '● 在线' : '○ 离线'}</Tag>
        )}
      </div>
      {showBrief && device && (
        <button
          type="button"
          onClick={onScrollToTop}
          title="设备信息已滚出视口，点击回到顶部"
          className="flex cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2 py-0.5 text-left transition-colors hover:bg-layout shrink-0"
        >
          <span className="max-w-[200px] truncate font-medium text-fg text-sm">{device.name}</span>
          <OnlineTag online={device.online} />
          {type && (
            <Tag variant="filled" className="m-0 text-xs">
              {type.name}
            </Tag>
          )}
          <span className="font-mono text-fg-tertiary text-xs">SN {device.deviceSn}</span>
          {!isVideo && alarmCount != null && Number(alarmCount) > 0 && (
            <Tag color="error" className="m-0 text-xs">
              ⚠ {alarmCount}
            </Tag>
          )}
        </button>
      )}
    </div>
  )
}

/** 当前范围的文字描述 (占位页使用) */
export function useScopeLabel() {
  const { siteId, deviceId } = useScope()
  return deviceId ? '设备' : siteId ? '园区' : '企业'
}
