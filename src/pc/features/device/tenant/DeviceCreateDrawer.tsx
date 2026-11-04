import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Form, Select } from 'antd'
import { Link } from 'react-router'
import { FormDrawer } from '@/components/form/FormDrawer'
import { fromLngLat, type LngLat } from '@/components/map/LocationPicker'
import { SITE_STATUS } from '@/components/StatusTag'
import { tenantSitesAllQuery } from '@/features/site/tenant/api'
import { useCompanyId } from '@/hooks/session'
import { invalidateTenant } from '@/lib/tenant'
import { BasicFields } from '../config/BasicFields'
import { SPEC_DEFAULTS, SpecFields } from '../config/SpecFields'
import { type DeviceTenantCreateBody, tenantDeviceApi } from './api'

type FormValues = Omit<DeviceTenantCreateBody, 'longitude' | 'latitude'> & { location?: LngLat }

/**
 * 企业登记设备 (FRONTEND_DESIGN §4.3)：自动授权给本企业并挂载到所选园区 (1~50 个，必填)
 * SN 已存在 (平台已入库或其他企业已登记) 返回 409 DEVICE_ALREADY_REGISTERED → "设备已登记，请联系平台分配"
 */
export function DeviceCreateDrawer({
  open,
  defaultSiteIds,
  onClose,
  onSaved,
}: {
  open: boolean
  /** 预选园区 (列表按园区筛选时) */
  defaultSiteIds?: number[]
  onClose: () => void
  onSaved: (id: number) => void
}) {
  const cid = useCompanyId()
  const qc = useQueryClient()
  const sites = useQuery({ ...tenantSitesAllQuery(cid), enabled: open })
  const noSite = sites.isSuccess && sites.data.length === 0

  const submit = async ({ location, ...v }: FormValues) => {
    const d = await tenantDeviceApi(cid).create({
      ...v,
      deviceSn: v.deviceSn.trim(),
      name: v.name.trim(),
      ...fromLngLat(location),
    })
    invalidateTenant(qc, cid, 'devices', 'sites', 'company')
    onSaved(d.id)
  }

  return (
    <FormDrawer<FormValues>
      open={open}
      title="登记设备"
      width={600}
      initialValues={{ ...SPEC_DEFAULTS, siteIds: defaultSiteIds }}
      onClose={onClose}
      onSubmit={submit}
      conflictField="deviceSn"
    >
      {noSite ? (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          title="还没有园区"
          description={
            <span>
              登记设备时必须挂载到园区，请先 <Link to={`/tenant/${cid}/sites?create=1`}>新建园区</Link>。
            </span>
          }
        />
      ) : (
        <Alert
          className="mb-4"
          type="info"
          showIcon
          title="设备登记后自动归属本企业并挂载到所选园区。如提示 SN 已登记，说明设备已在平台入库，请联系平台管理员分配。"
        />
      )}
      <SpecFields />
      <Form.Item
        name="siteIds"
        label="挂载园区"
        tooltip="数据使用端按园区展示设备，至少选择 1 个"
        rules={[
          { required: true, message: '请选择至少 1 个园区' },
          { type: 'array', max: 50, message: '最多 50 个园区' },
        ]}
      >
        <Select
          mode="multiple"
          placeholder="选择园区"
          loading={sites.isFetching}
          optionFilterProp="label"
          options={(sites.data ?? []).map((s) => ({
            value: s.id,
            label: s.status === 'active' ? s.name : `${s.name} (${SITE_STATUS[s.status]?.label})`,
          }))}
        />
      </Form.Item>
      <BasicFields />
    </FormDrawer>
  )
}
