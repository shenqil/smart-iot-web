import { PlusOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from 'antd'
import type { Key } from 'react'
import { useState } from 'react'
import { fetchAllPages } from '@/api/page'
import { notify } from '@/app/notify'
import { DEVICE_STATUS, enumOptions, OnlineTag } from '@/components/StatusTag'
import { type PageColumn, PageTable } from '@/components/table/PageTable'
import { RelationModal } from '@/components/table/RelationModal'
import { deviceColumns } from '@/features/device/columns'
import { useDeviceTypes } from '@/features/dict/api'
import { confirmAction } from '@/lib/confirm'
import { companyApi, companyKeys, type DeviceRow } from './api'

/** 企业详情 · 设备：授权 / 撤销授权 (撤销时同时解除该企业园区下的挂载) */
export function CompanyDevicesTab({ companyId }: { companyId: number }) {
  const qc = useQueryClient()
  const types = useDeviceTypes()
  const [adding, setAdding] = useState(false)
  const sites = useQuery({
    queryKey: [...companyKeys.sites(companyId), 'all'],
    queryFn: () => fetchAllPages((page, pageSize) => companyApi.sites(companyId, { page, pageSize, sort: 'name' })),
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: companyKeys.devices(companyId) })
    qc.invalidateQueries({ queryKey: companyKeys.detail(companyId) })
    qc.invalidateQueries({ queryKey: ['admin', 0, 'devices'] })
  }

  const revoke = (ids: Key[], clear?: () => void) =>
    confirmAction({
      title: `撤销 ${ids.length} 台设备的授权？`,
      content: '设备将从本企业的所有园区解除挂载，企业成员不再能看到这些设备；设备配置与其他企业的授权不受影响。',
      okText: '撤销授权',
      onOk: () => companyApi.batchDevices(ids as number[], [companyId], 'remove'),
      successText: (r) => `已撤销 ${(r as { removed: number }).removed} 台设备的授权`,
      onDone: () => {
        clear?.()
        refresh()
      },
    })

  const columns: PageColumn<DeviceRow>[] = [
    ...deviceColumns(types.nameOf),
    {
      title: '操作',
      width: 100,
      render: (_, r) => (
        <Button type="link" size="small" danger onClick={() => revoke([r.id])}>
          撤销授权
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageTable<DeviceRow>
        bare
        prefix="d_"
        queryKey={companyKeys.devices(companyId)}
        fetcher={(q) => companyApi.devices(companyId, q)}
        columns={columns}
        rowKey="id"
        keywordPlaceholder="SN / 名称 / SIM / MAC"
        defaultSort="-createdAt"
        filters={[
          {
            name: 'siteId',
            type: 'number',
            placeholder: '园区',
            options: (sites.data ?? []).map((s) => ({ value: s.id, label: s.name })),
            width: 140,
          },
          { name: 'deviceTypeId', type: 'number', placeholder: '设备类型', options: types.options, width: 140 },
          { name: 'status', placeholder: '状态', options: enumOptions(DEVICE_STATUS), width: 100 },
        ]}
        toolbar={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAdding(true)}>
            授权设备
          </Button>
        }
        batchActions={(keys, _r, clear) => (
          <Button danger size="small" onClick={() => revoke(keys, clear)}>
            批量撤销授权
          </Button>
        )}
      />
      <RelationModal<DeviceRow>
        open={adding}
        title="授权设备给企业"
        queryKey={companyKeys.devices(companyId)}
        fetchAvailable={(q) => companyApi.availableDevices(companyId, q)}
        rowKey={(r) => r.id}
        keywordPlaceholder="搜索 SN / 名称"
        label={(r) => (
          <span>
            <span className="font-mono">{r.deviceSn}</span> <span className="text-fg-tertiary">{r.name}</span>
          </span>
        )}
        columns={[
          { title: 'SN', dataIndex: 'deviceSn', render: (v) => <span className="font-mono">{v}</span> },
          { title: '名称', dataIndex: 'name' },
          { title: '类型', dataIndex: 'deviceTypeId', render: (v) => types.nameOf(v) },
          { title: '在线', dataIndex: 'online', render: (v) => <OnlineTag online={v} /> },
        ]}
        okText="授权"
        onConfirm={async (items) => {
          const r = await companyApi.batchDevices(
            items.map((i) => i.key as number),
            [companyId],
            'add',
          )
          notify.success(`已授权 ${r.added} 台设备 (授权后需企业管理员挂载到园区，数据使用端才可见)`)
          refresh()
        }}
        onClose={() => setAdding(false)}
      />
    </>
  )
}
