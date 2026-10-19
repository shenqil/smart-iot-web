import { Link } from 'react-router'
import type { Schemas } from '@/api/client'
import { DEVICE_STATUS, EnumTag, OnlineTag } from '@/components/StatusTag'
import type { PageColumn } from '@/components/table/PageTable'
import { fmtDateTime } from '@/lib/time'

export type DeviceRow = Schemas['DeviceView']

/** 设备表格的通用列 (平台设备列表、企业详情的设备页签共用)；nameOf 为设备类型名称映射 */
export function deviceColumns(
  nameOf: (id: number | null | undefined) => string,
  linkBase = '/admin/devices',
): PageColumn<DeviceRow>[] {
  return [
    {
      title: 'SN',
      dataIndex: 'deviceSn',
      sortField: 'deviceSn',
      render: (v, r) => (
        <Link to={`${linkBase}/${r.id}`} className="font-mono">
          {v}
        </Link>
      ),
    },
    { title: '名称', dataIndex: 'name', sortField: 'name' },
    { title: '类型', dataIndex: 'deviceTypeId', render: (v) => nameOf(v) },
    { title: '在线', dataIndex: 'online', width: 90, render: (v) => <OnlineTag online={v} /> },
    {
      title: '通道 (传感器 / 继电器)',
      render: (_, r) => (
        <span className="text-fg-secondary">
          {r.maxSensorChannels} / {r.maxRelayChannels}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      sortField: 'status',
      render: (v) => <EnumTag value={v} defs={DEVICE_STATUS} />,
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 160, sortField: 'createdAt', render: fmtDateTime },
  ]
}
