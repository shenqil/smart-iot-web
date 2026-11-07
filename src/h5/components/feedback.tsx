import { Dialog, Toast } from 'antd-mobile'
import { errorText } from '@/api/errors'
export const showFailure = (e: unknown) =>
  Toast.show({ getContainer: mobileContainer, content: errorText(e), icon: 'fail' })

export const mobileContainer = () => document.querySelector<HTMLElement>('.mobile-root') ?? document.body
export const mobileToast = {
  show: (props: Parameters<typeof Toast.show>[0]) =>
    Toast.show({ ...(typeof props === 'string' ? { content: props } : props), getContainer: mobileContainer }),
}
export const mobileDialog = {
  confirm: (props: Parameters<typeof Dialog.confirm>[0]) => Dialog.confirm({ ...props, getContainer: mobileContainer }),
  alert: (props: Parameters<typeof Dialog.alert>[0]) => Dialog.alert({ ...props, getContainer: mobileContainer }),
}
