import { useQueryClient } from '@tanstack/react-query'
import { DatePicker, Form, Input, Radio } from 'antd'
import { FormDrawer } from '@/components/form/FormDrawer'
import { OssUpload } from '@/components/form/OssUpload'
import { BIZ_TZ, dayjs } from '@/lib/time'
import { type Company, type CompanyBody, companyApi, companyKeys } from './api'

type FormValues = Omit<CompanyBody, 'expiredAt'> & { expiredAt?: dayjs.Dayjs | null }

/** 新建 / 编辑企业 (平台)：过期时间取所选日期当天 23:59:59 (业务时区) */
export function CompanyFormDrawer({
  open,
  company,
  onClose,
  onSaved,
}: {
  open: boolean
  /** 为空表示新建 */
  company?: Company | null
  onClose: () => void
  onSaved?: (id: number) => void
}) {
  const qc = useQueryClient()
  const initial: Partial<FormValues> = company
    ? { ...company, expiredAt: company.expiredAt ? dayjs(company.expiredAt).tz(BIZ_TZ) : null }
    : { status: 'active' }

  const submit = async (v: FormValues) => {
    const expiredAt = v.expiredAt ? v.expiredAt.tz(BIZ_TZ, true).endOf('day').format() : undefined
    const body: CompanyBody = { ...v, name: v.name.trim(), properties: company?.properties ?? undefined, expiredAt }
    // 修改为部分更新 (未传不修改)：清空过期时间要显式传 null
    const saved = company
      ? await companyApi.update(company.id, { ...body, expiredAt: expiredAt ?? null })
      : await companyApi.create(body)
    qc.invalidateQueries({ queryKey: companyKeys.all })
    onSaved?.(saved.id)
  }

  return (
    <FormDrawer<FormValues>
      open={open}
      title={company ? `编辑企业：${company.name}` : '新建企业'}
      initialValues={initial}
      onClose={onClose}
      onSubmit={submit}
      conflictField="name"
    >
      <Form.Item name="logo" label="Logo">
        <OssUpload scene="company-logo" size={72} />
      </Form.Item>
      <Form.Item
        name="name"
        label="企业全称"
        rules={[{ required: true, whitespace: true, message: '请输入企业名称' }, { max: 100 }]}
      >
        <Input placeholder="全局唯一" />
      </Form.Item>
      <div className="grid grid-cols-2 gap-x-4">
        <Form.Item name="contactPerson" label="联系人" rules={[{ max: 50 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="contactPhone" label="联系电话" rules={[{ max: 20 }]}>
          <Input />
        </Form.Item>
      </div>
      <Form.Item
        name="contactEmail"
        label="联系邮箱"
        rules={[{ type: 'email', message: '邮箱格式不正确' }, { max: 100 }]}
      >
        <Input />
      </Form.Item>
      <Form.Item name="address" label="地址" rules={[{ max: 200 }]}>
        <Input />
      </Form.Item>
      <div className="grid grid-cols-2 gap-x-4">
        <Form.Item
          name="expiredAt"
          label="服务过期时间"
          tooltip="不填表示不过期；过期后企业成员无法进入企业管理端与数据使用端"
        >
          <DatePicker className="w-full" placeholder="不过期" />
        </Form.Item>
        <Form.Item name="status" label="状态" tooltip="停用后企业成员无法进入">
          <Radio.Group
            optionType="button"
            options={[
              { value: 'active', label: '启用' },
              { value: 'inactive', label: '停用' },
            ]}
          />
        </Form.Item>
      </div>
      <Form.Item name="description" label="描述" rules={[{ max: 2000 }]}>
        <Input.TextArea rows={3} />
      </Form.Item>
    </FormDrawer>
  )
}
