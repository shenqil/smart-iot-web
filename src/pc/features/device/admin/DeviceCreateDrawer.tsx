import { useQueryClient } from '@tanstack/react-query'
import { Alert, Form } from 'antd'
import { FormDrawer } from '@/components/form/FormDrawer'
import { fromLngLat, type LngLat } from '@/components/map/LocationPicker'
import { useDeviceTypes } from '@/features/dict/api'
import { isVideoDeviceType } from '@/features/telemetry/lib/realtime'
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
  const [form] = Form.useForm<FormValues>()
  const types = useDeviceTypes()
  const deviceTypeId = Form.useWatch('deviceTypeId', form)
  const isVideo = isVideoDeviceType(deviceTypeId != null ? types.byId.get(deviceTypeId)?.name : undefined)

  const submit = async ({ location, ...v }: FormValues) => {
    const d = await adminDeviceApi.create({
      ...v,
      sensorChannels: v.sensorChannels ?? 16,
      relayChannels: v.relayChannels ?? 32,
      readInterval: v.readInterval ?? 60,
      deviceSn: v.deviceSn.trim(),
      name: v.name.trim(),
      ...fromLngLat(location),
    })
    qc.invalidateQueries({ queryKey: adminDeviceKeys.all })
    onSaved(d.id)
  }
  return (
    <FormDrawer<FormValues>
      form={form}
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
      <SpecFields isVideo={isVideo} />
      <BasicFields isVideo={isVideo} />
    </FormDrawer>
  )
}
