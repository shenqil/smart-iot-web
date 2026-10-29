import { useQuery } from '@tanstack/react-query'
import { Empty, Select } from 'antd'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { type DeviceConfigApi, deviceDetailKey } from '@/features/device/config/api'
import { LinkageEditor } from '@/features/device/config/LinkageEditor'

/**
 * 联动总览 (docs/AUTOMATION_CONTROL.md §9)：选择设备，查看 / 编辑它的告警规则控制了哪些继电器，
 * 以及哪些规则在控制它的继电器。与设备配置的「告警联动」页签相同，平台管理端与企业管理端共用。
 */
export function LinkageOverview({ cfg }: { cfg: DeviceConfigApi }) {
  const [params, setParams] = useSearchParams()
  const deviceId = Number(params.get('device')) || undefined
  const [keyword, setKeyword] = useState('')
  const search = useQuery({
    queryKey: [...cfg.keyPrefix, 'linkage-device-search', keyword],
    queryFn: () => cfg.searchDevices(keyword),
    staleTime: 30_000,
  })
  // 从链接打开时，选择框需要显示设备名
  const current = useQuery({
    queryKey: deviceDetailKey(cfg, deviceId ?? 0),
    queryFn: () => cfg.detail(deviceId as number),
    enabled: deviceId != null,
  })
  const options = (search.data ?? []).map((d) => ({ value: d.id, label: `${d.name} (${d.deviceSn})` }))
  if (current.data && !options.some((o) => o.value === current.data.id))
    options.unshift({ value: current.data.id, label: `${current.data.name} (${current.data.deviceSn})` })

  return (
    <div className="layout-fill">
      <div className="mb-3">
        <Select
          showSearch
          allowClear
          className="w-80"
          placeholder="搜索设备 SN / 名称"
          filterOption={false}
          loading={search.isFetching}
          value={deviceId}
          onSearch={setKeyword}
          onChange={(id?: number) => setParams(id ? { device: String(id) } : {}, { replace: true })}
          options={options}
          notFoundContent={search.isFetching ? '搜索中…' : '没有匹配的设备'}
        />
      </div>
      {deviceId ? (
        <LinkageEditor cfg={cfg} deviceId={deviceId} />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="选择设备，查看它的告警规则联动与控制它的继电器的规则"
        />
      )}
    </div>
  )
}
