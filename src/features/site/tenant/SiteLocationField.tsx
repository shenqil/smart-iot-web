import { Button, Form } from 'antd'
import { useState } from 'react'
import { notify } from '@/app/notify'
import { type LngLat, LocationPicker } from '@/components/map/LocationPicker'
import { type ReverseGeocode, reverseGeocode } from '@/components/map/tianditu'

const ADDRESS_FIELDS = ['province', 'city', 'district', 'address'] as const
type AddressField = (typeof ADDRESS_FIELDS)[number]
const LABEL: Record<AddressField, string> = { province: '省', city: '市', district: '区县', address: '详细地址' }

/** 逆地理编码的完整地址去掉行政区前缀，只留详细地址 */
export function toAddressFields(g: ReverseGeocode): Record<AddressField, string> {
  let rest = g.address.trim()
  for (const part of [g.province, g.city, g.district]) {
    if (part && rest.startsWith(part)) rest = rest.slice(part.length)
  }
  return { province: g.province, city: g.city, district: g.district, address: rest.trim() || g.address }
}

/**
 * 园区位置 (FRONTEND_DESIGN §4.2 / §6)：地图选点后逆地理编码回填省 / 市 / 区 / 地址
 * 只自动填写空字段；已有不同的值时询问是否覆盖。必须放在包含这四个字段的 Form 内
 */
export function SiteLocationField({ value, onChange }: { value?: LngLat; onChange?: (v: LngLat) => void }) {
  const form = Form.useFormInstance()
  const [filling, setFilling] = useState(false)

  const fill = async ([lng, lat]: [number, number], manual = false) => {
    setFilling(true)
    const geo = await reverseGeocode(lng, lat).catch(() => null)
    setFilling(false)
    if (!geo || !(geo.province || geo.address)) {
      if (manual) notify.warning('未能获取该位置的地址，请手动填写')
      return
    }
    const next = toAddressFields(geo)
    const current = form.getFieldsValue(ADDRESS_FIELDS as unknown as string[]) as Partial<Record<AddressField, string>>
    const blank = ADDRESS_FIELDS.filter((f) => next[f] && !current[f]?.trim())
    const differ = ADDRESS_FIELDS.filter((f) => next[f] && current[f]?.trim() && current[f]?.trim() !== next[f])
    const set = (fields: AddressField[]) => form.setFieldsValue(Object.fromEntries(fields.map((f) => [f, next[f]])))
    if (blank.length) set(blank)
    if (!differ.length) {
      if (manual && !blank.length) notify.info('地址与该位置一致，无需修改')
      return
    }
    notify.modal()?.confirm({
      title: '用选点位置的地址覆盖已填写的内容？',
      content: (
        <ul className="m-0 mt-2 list-none space-y-1 p-0 text-sm">
          {differ.map((f) => (
            <li key={f}>
              <span className="text-fg-secondary">{LABEL[f]}：</span>
              <s className="text-fg-tertiary">{current[f]}</s> → {next[f]}
            </li>
          ))}
        </ul>
      ),
      okText: '覆盖',
      cancelText: '保留原值',
      onOk: () => set(differ),
    })
  }

  return (
    <div>
      <LocationPicker value={value} onChange={onChange} onPicked={(v) => fill(v)} />
      {value && (
        <Button type="link" size="small" className="px-0" loading={filling} onClick={() => fill(value, true)}>
          按坐标填写地址
        </Button>
      )}
    </div>
  )
}
