import { DeleteOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Space } from 'antd'
import type { Key } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ACTIVE_STATUS, enumOptions } from '@/components/StatusTag'
import { type PageColumn, PageTable } from '@/components/table/PageTable'
import { useDeviceTypes } from '@/features/dict/api'
import { affectedText, confirmAction } from '@/lib/confirm'
import { type DeviceRow, deviceColumns } from '../columns'
import { adminDeviceApi, adminDeviceKeys } from './api'
import { BatchAuthorizeModal } from './BatchAuthorizeModal'
import { DeviceCreateDrawer } from './DeviceCreateDrawer'

/** 设备列表 (FRONTEND_DESIGN §3.4)：在线状态由接口逐行返回，不能按在线筛选或排序 */
export default function DeviceListPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const types = useDeviceTypes()
  const [creating, setCreating] = useState(false)
  const [authorizing, setAuthorizing] = useState<number[] | null>(null)

  const remove = (ids: Key[], clear?: () => void) =>
    confirmAction({
      title: `删除 ${ids.length} 台设备？`,
      content: '将同时删除所有企业授权与园区挂载，在线设备会被断开；设备的告警与操作记录保留。此操作不可恢复。',
      okText: '删除',
      onOk: () => adminDeviceApi.remove(ids as number[]),
      successText: affectedText('删除'),
      onDone: () => {
        clear?.()
        qc.invalidateQueries({ queryKey: adminDeviceKeys.all })
      },
    })

  const columns: PageColumn<DeviceRow>[] = [
    ...deviceColumns(types.nameOf),
    {
      title: '操作',
      width: 150,
      fixed: 'right',
      render: (_, r) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => navigate(`/admin/devices/${r.id}`)}
          >
            配置
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => remove([r.id])}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageTable<DeviceRow>
        queryKey={adminDeviceKeys.list}
        fetcher={adminDeviceApi.list}
        columns={columns}
        rowKey="id"
        keywordPlaceholder="SN / 名称 / SIM / MAC"
        defaultSort="-createdAt"
        filters={[
          { name: 'deviceTypeId', type: 'number', placeholder: '设备类型', options: types.options, width: 150 },
          { name: 'status', placeholder: '状态', options: enumOptions(ACTIVE_STATUS), width: 100 },
          {
            name: 'unassigned',
            type: 'boolean',
            placeholder: '企业归属',
            options: [{ value: true, label: '只看公海设备' }],
            width: 140,
          },
        ]}
        toolbar={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
            登记设备
          </Button>
        }
        batchActions={(keys, _r, clear) => (
          <>
            <Button size="small" onClick={() => setAuthorizing(keys as number[])}>
              批量授权
            </Button>
            <Button danger size="small" onClick={() => remove(keys, clear)}>
              批量删除
            </Button>
          </>
        )}
      />
      <DeviceCreateDrawer
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(id) => navigate(`/admin/devices/${id}`)}
      />
      <BatchAuthorizeModal
        deviceIds={authorizing}
        onClose={() => setAuthorizing(null)}
        onDone={() => qc.invalidateQueries({ queryKey: adminDeviceKeys.all })}
      />
    </>
  )
}
