import { PlusOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from 'antd'
import type { Key } from 'react'
import { useState } from 'react'
import { Link } from 'react-router'
import { notify } from '@/app/notify'
import { ACTIVE_STATUS, EnumTag, ExpireTag } from '@/components/StatusTag'
import { type PageColumn, PageTable } from '@/components/table/PageTable'
import { RelationModal } from '@/components/table/RelationModal'
import { confirmAction } from '@/lib/confirm'
import { fmtDateTime } from '@/lib/time'
import { type AvailableCompany, adminDeviceApi, adminDeviceKeys, type DeviceCompany } from './api'

/** 设备详情 · 授权企业 (平台) */
export function DeviceCompaniesTab({ deviceId }: { deviceId: number }) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const refresh = () => {
    qc.invalidateQueries({ queryKey: adminDeviceKeys.companies(deviceId) })
    qc.invalidateQueries({ queryKey: ['admin', 0, 'devices', 'detail', deviceId] })
    qc.invalidateQueries({ queryKey: ['admin', 0, 'companies'] })
  }

  const revoke = (ids: Key[], clear?: () => void) =>
    confirmAction({
      title: `撤销 ${ids.length} 家企业的授权？`,
      content: '设备会从这些企业的园区解除挂载，企业成员不再能看到该设备。',
      okText: '撤销授权',
      onOk: () => adminDeviceApi.batchCompanies([deviceId], ids as number[], 'remove'),
      successText: (r) => `已撤销 ${(r as { removed: number }).removed} 家企业的授权`,
      onDone: () => {
        clear?.()
        refresh()
      },
    })

  const columns: PageColumn<DeviceCompany>[] = [
    {
      title: '企业',
      dataIndex: 'companyName',
      sortField: 'companyName',
      render: (v, r) => <Link to={`/admin/companies/${r.companyId}`}>{v}</Link>,
    },
    { title: '企业状态', dataIndex: 'companyStatus', render: (v) => <EnumTag value={v} defs={ACTIVE_STATUS} /> },
    { title: '服务过期', dataIndex: 'expiredAt', render: (v) => <ExpireTag value={v} /> },
    { title: '授权时间', dataIndex: 'authorizedAt', width: 160, sortField: 'authorizedAt', render: fmtDateTime },
    {
      title: '操作',
      width: 100,
      render: (_, r) => (
        <Button type="link" size="small" danger onClick={() => revoke([r.companyId])}>
          撤销授权
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageTable<DeviceCompany>
        bare
        prefix="c_"
        queryKey={adminDeviceKeys.companies(deviceId)}
        fetcher={(q) => adminDeviceApi.companies(deviceId, q)}
        columns={columns}
        rowKey="companyId"
        keywordPlaceholder="企业名称"
        defaultSort="-authorizedAt"
        toolbar={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAdding(true)}>
            授权给企业
          </Button>
        }
        batchActions={(keys, _r, clear) => (
          <Button danger size="small" onClick={() => revoke(keys, clear)}>
            批量撤销
          </Button>
        )}
      />
      <RelationModal<AvailableCompany>
        open={adding}
        title="授权给企业"
        queryKey={adminDeviceKeys.companies(deviceId)}
        fetchAvailable={(q) => adminDeviceApi.availableCompanies(deviceId, q)}
        rowKey={(r) => r.companyId}
        keywordPlaceholder="搜索企业名称"
        label={(r) => r.companyName}
        max={100}
        columns={[
          { title: '企业', dataIndex: 'companyName' },
          { title: '状态', dataIndex: 'companyStatus', render: (v) => <EnumTag value={v} defs={ACTIVE_STATUS} /> },
          { title: '服务过期', dataIndex: 'expiredAt', render: (v) => <ExpireTag value={v} /> },
        ]}
        okText="授权"
        onConfirm={async (items) => {
          const r = await adminDeviceApi.batchCompanies(
            [deviceId],
            items.map((i) => i.key as number),
            'add',
          )
          notify.success(`已授权给 ${r.added} 家企业 (需企业管理员挂载到园区，数据使用端才可见)`)
          refresh()
        }}
        onClose={() => setAdding(false)}
      />
    </>
  )
}
