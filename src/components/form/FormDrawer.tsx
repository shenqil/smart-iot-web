import { Button, Drawer, Form, type FormInstance, Space } from 'antd'
import { type ReactNode, useEffect, useState } from 'react'
import { isApiError } from '@/api/errors'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'
import { applyFormErrors, isValidationError } from '@/lib/form'

export interface FormDrawerProps<V> {
  open: boolean
  title: ReactNode
  /** 打开时的表单初始值 (编辑时传记录) */
  initialValues?: Partial<V>
  /** 提交：抛出 ApiError 时自动把 422 字段错误标到表单，其他错误提示后保持打开 */
  onSubmit: (values: V) => Promise<unknown>
  onClose: () => void
  /** 成功提示，默认"保存成功" */
  successText?: string | false
  width?: number
  okText?: string
  /** 唯一约束冲突 (409 DUPLICATE) 时把错误标到这个字段，如 name */
  conflictField?: string
  /** 外部需要 watch 字段时传入 */
  form?: FormInstance<V>
  children: ReactNode | ((form: FormInstance<V>) => ReactNode)
}

/** 新建 / 编辑抽屉 (FRONTEND_DESIGN §7)：提交中禁用、未保存离开确认、后端字段错误回填 */
export function FormDrawer<V extends object>(props: FormDrawerProps<V>) {
  const [inner] = Form.useForm<V>()
  const form = props.form ?? inner
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (props.open) {
      form.resetFields()
      if (props.initialValues) form.setFieldsValue(props.initialValues as never)
      setDirty(false)
    }
  }, [props.open, props.initialValues, form])

  const close = () => {
    if (!dirty || saving) return props.onClose()
    notify.modal()?.confirm({
      title: '放弃未保存的修改？',
      okText: '放弃',
      okButtonProps: { danger: true },
      cancelText: '继续编辑',
      onOk: props.onClose,
    })
  }

  const submit = async () => {
    let values: V
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setSaving(true)
    try {
      await props.onSubmit(values)
      if (props.successText !== false) notify.success(props.successText ?? '保存成功')
      setDirty(false)
      props.onClose()
    } catch (e) {
      if (isApiError(e) && isValidationError(e)) {
        const rest = applyFormErrors(form, e)
        notify.error(rest[0] ?? '请检查表单中标红的字段')
      } else {
        if (isApiError(e) && e.status === 409 && props.conflictField) {
          form.setFields([{ name: props.conflictField as never, errors: [e.message] }])
        }
        handleGlobalError(e)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={props.open}
      title={props.title}
      size={props.width ?? 560}
      onClose={close}
      destroyOnHidden
      maskClosable={!dirty}
      footer={
        <Space className="flex justify-end">
          <Button onClick={close}>取消</Button>
          <Button type="primary" loading={saving} onClick={submit}>
            {props.okText ?? '保存'}
          </Button>
        </Space>
      }
    >
      <Form<V> form={form} layout="vertical" onValuesChange={() => setDirty(true)} requiredMark="optional">
        {typeof props.children === 'function' ? props.children(form) : props.children}
      </Form>
    </Drawer>
  )
}
