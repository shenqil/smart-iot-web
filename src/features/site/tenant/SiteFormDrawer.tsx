import { useQueryClient } from '@tanstack/react-query'
import { Form, Input, Radio } from 'antd'
import { FormDrawer } from '@/components/form/FormDrawer'
import { OssImageWall, OssUpload } from '@/components/form/OssUpload'
import { fromLngLat, type LngLat, toLngLat } from '@/components/map/LocationPicker'
import { enumOptions, SITE_STATUS } from '@/components/StatusTag'
import { useCompanyId } from '@/hooks/session'
import { invalidateTenant } from '@/lib/tenant'
import { type Site, type SiteBody, type SiteDetail, tenantSiteApi } from './api'
import { SiteLocationField } from './SiteLocationField'

type FormValues = Omit<SiteBody, 'longitude' | 'latitude' | 'properties'> & { location?: LngLat }

const toForm = (s: Site | SiteDetail): FormValues => ({
  name: s.name,
  status: s.status,
  location: toLngLat(s),
  province: s.province,
  city: s.city,
  district: s.district,
  address: s.address,
  description: s.description,
  coverImage: s.coverImage,
  images: s.images ?? [],
})

/** 新建 / 编辑园区 (企业端 §4.2)：名称企业内唯一；地图选点回填省市区与地址 */
export function SiteFormDrawer({
  open,
  site,
  onClose,
  onSaved,
}: {
  open: boolean
  /** 为空表示新建 */
  site?: Site | SiteDetail | null
  onClose: () => void
  onSaved?: (id: number) => void
}) {
  const qc = useQueryClient()
  const cid = useCompanyId()
  const api = tenantSiteApi(cid)

  const submit = async ({ location, ...v }: FormValues) => {
    const body = { ...v, name: v.name.trim(), images: v.images ?? [] }
    const saved = site
      ? // 部分更新：清除坐标要显式传 null
        await api.update(site.id, {
          ...body,
          longitude: location ? location[0] : null,
          latitude: location ? location[1] : null,
        })
      : await api.create({ ...body, ...fromLngLat(location) })
    invalidateTenant(qc, cid, 'sites', 'company')
    onSaved?.(saved.id)
  }

  return (
    <FormDrawer<FormValues>
      open={open}
      title={site ? `编辑园区：${site.name}` : '新建园区'}
      width={640}
      initialValues={site ? toForm(site) : { status: 'active', images: [] }}
      onClose={onClose}
      onSubmit={submit}
      conflictField="name"
    >
      <Form.Item
        name="name"
        label="园区名称"
        rules={[{ required: true, whitespace: true, message: '请输入园区名称' }, { max: 100 }]}
      >
        <Input placeholder="企业内唯一" />
      </Form.Item>
      <Form.Item name="status" label="状态" tooltip="建设中、停用的园区在数据使用端灰显">
        <Radio.Group optionType="button" options={enumOptions(SITE_STATUS)} />
      </Form.Item>
      <Form.Item name="location" label="位置">
        <SiteLocationField />
      </Form.Item>
      <div className="grid grid-cols-3 gap-x-4">
        <Form.Item name="province" label="省" rules={[{ max: 50 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="city" label="市" rules={[{ max: 50 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="district" label="区县" rules={[{ max: 50 }]}>
          <Input />
        </Form.Item>
      </div>
      <Form.Item name="address" label="详细地址" rules={[{ max: 200 }]}>
        <Input />
      </Form.Item>
      <Form.Item name="description" label="描述" rules={[{ max: 2000 }]}>
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item name="coverImage" label="封面图">
        <OssUpload scene="site-cover" />
      </Form.Item>
      <Form.Item name="images" label="园区图片">
        <OssImageWall scene="site-image" max={50} />
      </Form.Item>
    </FormDrawer>
  )
}
