import type { ReactNode } from 'react'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'

export interface ConfirmActionOptions {
  title: ReactNode
  content?: ReactNode
  okText?: string
  danger?: boolean
  /** 执行操作；返回值传给 successText 生成提示 */
  onOk: () => Promise<unknown>
  successText?: string | ((result: unknown) => string)
  onDone?: () => void
}

/** 二次确认后执行 (批量删除、移出、断开等)；失败走全局错误处理，弹窗保持到请求结束 */
export function confirmAction(o: ConfirmActionOptions) {
  notify.modal()?.confirm({
    title: o.title,
    content: o.content,
    okText: o.okText ?? '确定',
    okButtonProps: { danger: o.danger ?? true },
    cancelText: '取消',
    onOk: async () => {
      try {
        const r = await o.onOk()
        const text = typeof o.successText === 'function' ? o.successText(r) : o.successText
        if (text) notify.success(text)
        o.onDone?.()
      } catch (e) {
        handleGlobalError(e)
      }
    },
  })
}

/** 后端批量接口返回 {affected} */
export const affectedText =
  (verb: string) =>
  (r: unknown): string => {
    const n = (r as { affected?: number } | undefined)?.affected
    return n === undefined ? `${verb}成功` : `已${verb} ${n} 项`
  }
