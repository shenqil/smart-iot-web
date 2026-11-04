import type { ReactNode } from 'react'

/** 公共业务层只依赖反馈契约，不导入 PC 或移动组件库。 */
export interface NoticeDialog {
  title?: ReactNode
  content?: ReactNode
  okText?: string
  cancelText?: string
  okButtonProps?: { danger?: boolean }
  onOk?: () => unknown
  onCancel?: () => unknown
  afterClose?: () => void
}

export interface NotifyAdapter {
  success: (content: ReactNode) => void
  info: (content: string) => void
  warning: (content: string) => void
  error: (content: string) => void
  modal: { confirm: (options: NoticeDialog) => void; warning: (options: NoticeDialog) => void }
}

let adapter: NotifyAdapter | null = null
const pending: ((target: NotifyAdapter) => void)[] = []
const dispatch = (action: (target: NotifyAdapter) => void) => {
  if (adapter) action(adapter)
  else {
    pending.push(action)
    if (pending.length > 20) pending.shift()
  }
}

/** Provider 卸载仅移除自己绑定的实例，避免跨端切换时旧清理覆盖新实例。 */
export function bindNotify(next: NotifyAdapter) {
  adapter = next
  for (const action of pending.splice(0)) action(next)
  return () => {
    if (adapter === next) adapter = null
  }
}

const modal = {
  confirm: (options: NoticeDialog) => dispatch((target) => target.modal.confirm(options)),
  warning: (options: NoticeDialog) => dispatch((target) => target.modal.warning(options)),
}
export const notify = {
  success: (content: ReactNode) => dispatch((target) => target.success(content)),
  info: (content: string) => dispatch((target) => target.info(content)),
  warning: (content: string) => dispatch((target) => target.warning(content)),
  error: (content: string) => dispatch((target) => target.error(content)),
  modal: () => modal,
}
