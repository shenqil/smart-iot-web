import { AlertOutlined, AppstoreOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Tag } from 'antd'
import { DEVICE_STATUS, EnumTag, OnlineTag } from '@/components/StatusTag'
import { scopedUnprocessedCountQuery } from '@/features/alarm/api'
import type { AppDevice } from '@/features/device/api'
import type { DeviceType } from '@/features/dict/api'
import { useCompanyId } from '@/hooks/session'

/** 设备工作区页头：身份 (名称、类型、SN) + 状态 (在线、启用) + 未处理告警 (点击跳到告警记录) */
export function DeviceHero({
  device,
  type,
  online,
  meta,
  hideInterval,
}: {
  device: AppDevice
  type: DeviceType | undefined
  online: boolean
  /** 右侧补充信息 (如"更新于 8 秒前") */
  meta?: React.ReactNode
  /** 隐藏采集间隔 (视频监控) */
  hideInterval?: boolean
}) {
  const companyId = useCompanyId()
  const { data: alarm } = useQuery(scopedUnprocessedCountQuery(companyId, { deviceId: device.id }))
  const alarmCount = alarm ? (alarm.capped ? '999+' : String(alarm.count)) : null

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg bg-container px-5 py-4">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary-bg text-primary text-xl">
        {type?.icon ? <img src={type.icon} alt="" className="size-7 object-contain" /> : <AppstoreOutlined />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 truncate font-semibold text-fg text-lg">{device.name}</h2>
          <OnlineTag online={online} />
          {device.status !== 'active' && <EnumTag value={device.status} defs={DEVICE_STATUS} />}
          {type && (
            <Tag variant="filled" className="m-0">
              {type.name}
            </Tag>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-fg-secondary text-sm">
          <span>
            SN <span className="font-mono text-fg">{device.deviceSn}</span>
          </span>
          {!hideInterval && device.readInterval > 0 && <span>采集间隔 {device.readInterval} 秒</span>}
          {meta}
        </div>
      </div>
      {alarmCount != null && (
        <a
          href="#device-alarms"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 no-underline ${
            alarm?.count ? 'bg-danger/10 text-danger hover:bg-danger/15' : 'text-fg-tertiary hover:text-fg-secondary'
          }`}
        >
          <AlertOutlined />
          {alarm?.count ? (
            <span>
              <b className="text-lg tabular-nums">{alarmCount}</b> 条未处理告警
            </span>
          ) : (
            <span>暂无未处理告警</span>
          )}
        </a>
      )}
    </div>
  )
}
