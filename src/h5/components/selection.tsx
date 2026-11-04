import { Button, List, Picker, Popup } from 'antd-mobile'
import { type ReactNode, useId, useState } from 'react'
import { mobileContainer } from './feedback'
export function Sheet({
  title,
  visible,
  close,
  children,
  footer,
  dismissible = true,
}: {
  title: string
  visible: boolean
  close: () => void
  children: ReactNode
  footer?: ReactNode
  dismissible?: boolean
}) {
  const id = useId()
  return (
    <Popup
      getContainer={mobileContainer}
      visible={visible}
      onMaskClick={() => {
        if (dismissible) close()
      }}
      onClose={() => {
        if (dismissible) close()
      }}
      destroyOnClose
      bodyClassName="h5-sheet"
    >
      <div className="h5-sheet-header">
        <h2 id={id}>{title}</h2>
        <Button fill="none" aria-label={`关闭${title}`} disabled={!dismissible} onClick={close}>
          完成
        </Button>
      </div>
      <section className="h5-sheet-body" aria-labelledby={id}>
        {children}
      </section>
      {footer && <div className="h5-sheet-footer">{footer}</div>}
    </Popup>
  )
}
export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value?: string
  options: { label: string; value: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false),
    selected = options.find((o) => o.value === (value ?? ''))
  return (
    <>
      <List className="h5-select-field">
        <List.Item
          arrow
          disabled={!options.length}
          onClick={() => setOpen(true)}
          extra={selected?.label ?? '请选择'}
          aria-label={`${label}：${selected?.label ?? '请选择'}`}
        >
          {label}
        </List.Item>
      </List>
      <Picker
        getContainer={mobileContainer}
        title={label}
        visible={open}
        onClose={() => setOpen(false)}
        columns={[options]}
        value={[selected?.value ?? null]}
        onConfirm={(v) => {
          if (v[0] != null) onChange(String(v[0]))
        }}
      />
    </>
  )
}
