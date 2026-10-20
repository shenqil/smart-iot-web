import { LinkOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from 'antd'
import type { Key } from 'react'
import { useState } from 'react'
import { Link } from 'react-router'
import { notify } from '@/app/notify'
import { EnumTag, SITE_STATUS } from '@/components/StatusTag'
import { type PageColumn, PageTable } from '@/components/table/PageTable'
import { RelationModal } from '@/components/table/RelationModal'
import { useCompanyId } from '@/hooks/session'
import { joinAddress } from '@/lib/address'
import { confirmAction } from '@/lib/confirm'
import { invalidateTenant } from '@/lib/tenant'
import { fmtDateTime } from '@/lib/time'
import {
  type AvailableSite,
  MAX_DEVICE_SITES,
  type MountedSite,
  nextSiteIds,
  tenantDeviceApi,
  tenantDeviceKeys,
} from './api'

/**
 * 设备配置 · 挂载园区 (企业端)：只含本企业园区。
 * 接口为"全集替换"，增删前先取当前全部挂载，再按差异提交
 */
export function DeviceSitesTab({ deviceId }: { deviceId: number }) {
  const cid = useCompanyId()
  const api = tenantDeviceApi(cid)
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const refresh = () => invalidateTenant(qc, cid, 'devices', 'sites', 'company')

  const save = async (add: number[], remove: number[]) => {
    const ids = nextSiteIds(await api.mountedSiteIds(deviceId), add, remove)
    if (ids.length > MAX_DEVICE_SITES) throw new Error(`一台设备最多挂载 ${MAX_DEVICE_SITES} 个园区`)
    return api.setSites(deviceId, ids)
  }

  const unmount = (ids: Key[], clear?: () => void) =>
    confirmAction({
      title: `从 ${ids.length} 个园区解除挂载？`,
      content: '设备仍属于本企业；不再挂载任何园区时，数据使用端将看不到该设备。',
      okText: '解除挂载',
      onOk: () => save([], ids as number[]),
      successText: (r) => `已解除 ${(r as { removed: number }).removed} 个园区的挂载`,
      onDone: () => {
        clear?.()
        refresh()
      },
    })

  const columns: PageColumn<MountedSite>[] = [
    {
      title: '园区',
      dataIndex: 'name',
      sortField: 'name',
      render: (v, r) => <Link to={`/tenant/${cid}/sites/${r.id}`}>{v}</Link>,
    },
    { title: '状态', dataIndex: 'status', width: 90, render: (v) => <EnumTag value={v} defs={SITE_STATUS} /> },
    { title: '地址', render: (_, r) => joinAddress(r) || '—' },
    { title: '挂载时间', dataIndex: 'mountedAt', width: 160, sortField: 'mountedAt', render: fmtDateTime },
    {
      title: '操作',
      width: 100,
      render: (_, r) => (
        <Button type="link" size="small" danger onClick={() => unmount([r.id])}>
          解除挂载
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageTable<MountedSite>
        bare
        prefix="s_"
        queryKey={tenantDeviceKeys.sites(cid, deviceId)}
        fetcher={(q) => api.sites(deviceId, q)}
        columns={columns}
        rowKey="id"
        keywordPlaceholder="园区名称"
        defaultSort="-mountedAt"
        toolbar={
          <Button type="primary" icon={<LinkOutlined />} onClick={() => setAdding(true)}>
            挂载到园区
          </Button>
        }
        batchActions={(keys, _r, clear) => (
          <Button danger size="small" onClick={() => unmount(keys, clear)}>
            批量解除
          </Button>
        )}
      />
      <RelationModal<AvailableSite>
        open={adding}
        title="挂载到园区"
        queryKey={tenantDeviceKeys.sites(cid, deviceId)}
        fetchAvailable={(q) => api.availableSites(deviceId, q)}
        rowKey={(r) => r.id}
        keywordPlaceholder="搜索园区名称"
        label={(r) => r.name}
        max={MAX_DEVICE_SITES}
        columns={[
          { title: '园区', dataIndex: 'name' },
          { title: '状态', dataIndex: 'status', render: (v) => <EnumTag value={v} defs={SITE_STATUS} /> },
          { title: '地址', render: (_, r) => joinAddress(r) || '—' },
        ]}
        okText="挂载"
        onConfirm={async (items) => {
          const r = await save(
            items.map((i) => i.key as number),
            [],
          )
          notify.success(`已挂载到 ${r.added} 个园区`)
          refresh()
        }}
        onClose={() => setAdding(false)}
      />
    </>
  )
}
