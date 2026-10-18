import { DeleteOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Tag } from 'antd'
import { useNavigate, useParams } from 'react-router'
import { confirmAction } from '@/lib/confirm'
import { adminDeviceConfigApi } from '../config/api'
import { DeviceConfigPage } from '../config/DeviceConfigPage'
import { adminDeviceApi, adminDeviceKeys } from './api'
import { DeviceCompaniesTab } from './DeviceCompaniesTab'

/** 平台 · 设备配置页 = 通用配置页 + 授权企业页签 + 删除 */
export default function DeviceDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  return (
    <DeviceConfigPage
      cfg={adminDeviceConfigApi}
      id={id}
      backTo="/admin/devices"
      headerExtra={(d) => (
        <>
          {d.companyCount === 0 && <Tag color="orange">公海设备</Tag>}
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() =>
              confirmAction({
                title: `删除设备「${d.name}」？`,
                content: '将同时删除所有企业授权与园区挂载，在线设备会被断开；告警与操作记录保留。此操作不可恢复。',
                okText: '删除',
                onOk: () => adminDeviceApi.remove([id]),
                successText: '设备已删除',
                onDone: () => {
                  navigate('/admin/devices', { replace: true })
                  qc.removeQueries({ queryKey: ['admin', 0, 'devices', 'detail', id] })
                  qc.invalidateQueries({ queryKey: adminDeviceKeys.list })
                },
              })
            }
          >
            删除
          </Button>
        </>
      )}
      extraTabs={[
        {
          key: 'companies',
          label: '授权企业',
          children: <DeviceCompaniesTab deviceId={id} />,
        },
      ]}
    />
  )
}
