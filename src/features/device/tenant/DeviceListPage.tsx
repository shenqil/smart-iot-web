import { PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Space } from 'antd'
import type { Key } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { DEVICE_STATUS, enumOptions } from '@/components/StatusTag'
import { type PageColumn, PageTable } from '@/components/table/PageTable'
import { useDeviceTypes } from '@/features/dict/api'
import { tenantSitesAllQuery } from '@/features/site/tenant/api'
import { useCompanyId } from '@/hooks/session'
import { affectedText, confirmAction } from '@/lib/confirm'
import { invalidateTenant } from '@/lib/tenant'
import { type DeviceRow, deviceColumns } from '../columns'
import { tenantDeviceApi, tenantDeviceKeys } from './api'
import { DeviceCreateDrawer } from './DeviceCreateDrawer'

export const DEVICE_REMOVE_TIP =
  '只解除本企业的授权，并解除设备在本企业园区下的挂载；设备本身、设备配置与历史数据保留。如需再次使用请联系平台管理员授权。'

/** 企业设备列表 (FRONTEND_DESIGN §4.3)：本企业已授权的设备；"删除"即移出本企业 */
export default function DeviceListPage() {
  const cid = useCompanyId()
  const api = tenantDeviceApi(cid)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const types = useDeviceTypes()
  const sites = useQuery(tenantSitesAllQuery(cid))
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const configPath = (id: number) => `/tenant/${cid}/devices/${id}`

  // 概览页"登记设备"快捷入口：?create=1
  useEffect(() => {
    if (params.get('create') !== '1') return
    setCreating(true)
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete('create')
        return p
      },
      { replace: true },
    )
  }, [params, setParams])

  const remove = (ids: Key[], clear?: () => void) =>
    confirmAction({
      title: `将 ${ids.length} 台设备移出本企业？`,
      content: DEVICE_REMOVE_TIP,
      okText: '移出',
      onOk: () => api.remove(ids as number[]),
      successText: affectedText('移出'),
      onDone: () => {
        clear?.()
        invalidateTenant(qc, cid, 'devices', 'sites', 'company')
      },
    })

  const columns: PageColumn<DeviceRow>[] = [
    ...deviceColumns(types.nameOf, `/tenant/${cid}/devices`),
    {
      title: '操作',
      width: 150,
      fixed: 'right',
      render: (_, r) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<SettingOutlined />} onClick={() => navigate(configPath(r.id))}>
            配置
          </Button>
          <Button type="link" size="small" danger onClick={() => remove([r.id])}>
            移出
          </Button>
        </Space>
      ),
    },
  ]

  const siteFilter = params.get('siteId')

  return (
    <>
      <PageTable<DeviceRow>
        queryKey={tenantDeviceKeys.list(cid)}
        fetcher={api.list}
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
            width: 160,
          },
          { name: 'deviceTypeId', type: 'number', placeholder: '设备类型', options: types.options, width: 150 },
          { name: 'status', placeholder: '状态', options: enumOptions(DEVICE_STATUS), width: 100 },
        ]}
        toolbar={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
            登记设备
          </Button>
        }
        batchActions={(keys, _r, clear) => (
          <Button danger size="small" onClick={() => remove(keys, clear)}>
            批量移出
          </Button>
        )}
      />
      <DeviceCreateDrawer
        open={creating}
        defaultSiteIds={siteFilter ? [Number(siteFilter)] : undefined}
        onClose={() => setCreating(false)}
        onSaved={(id) => navigate(configPath(id))}
      />
    </>
  )
}
