import { useQueryClient } from '@tanstack/react-query'
import { Alert } from 'antd'
import { FormDrawer } from '@/components/form/FormDrawer'
import { fromLngLat, type LngLat } from '@/components/map/LocationPicker'
import { BasicFields } from '../config/BasicFields'
import { SPEC_DEFAULTS, SpecFields } from '../config/SpecFields'
import { adminDeviceApi, adminDeviceKeys, type DeviceCreateBody } from './api'

type FormValues = Omit<DeviceCreateBody, 'longitude' | 'latitude'> & { location?: LngLat }

/** 平台登记设备 (进入公海，需另行授权给企业) */
export function DeviceCreateDrawer({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: (id: number) => void
}) {
  const qc = useQueryClient()
  const submit = async ({ location, ...v }: FormValues) => {
    const d = await adminDeviceApi.create({
      ...v,
      deviceSn: v.deviceSn.trim(),
      name: v.name.trim(),
      ...fromLngLat(location),
    })
    qc.invalidateQueries({ queryKey: adminDeviceKeys.all })
    onSaved(d.id)
  }
  return (
    <FormDrawer<FormValues>
      open={open}
      title="登记设备"
      width={600}
      initialValues={SPEC_DEFAULTS}
      onClose={onClose}
      onSubmit={submit}
      conflictField="deviceSn"
    >
      <Alert
        className="mb-4"
        type="info"
        showIcon
        title="平台登记的设备进入公海 (不属于任何企业)，可在设备详情中授权给企业。"
      />
      <SpecFields />
      <BasicFields />
    </FormDrawer>
  )
}
