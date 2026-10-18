import type { MessageInstance } from 'antd/es/message/interface'
import type { ModalStaticFunctions } from 'antd/es/modal/confirm'

/** antd 静态方法无法读取主题，由 <AppBridge> 注入 App.useApp() 的实例 */
let messageApi: MessageInstance | null = null
let modalApi: Omit<ModalStaticFunctions, 'warn'> | null = null

export const bindNotify = (message: MessageInstance, modal: Omit<ModalStaticFunctions, 'warn'>) => {
  messageApi = message
  modalApi = modal
}

type Content = Parameters<MessageInstance['success']>[0]

export const notify = {
  success: (content: Content) => messageApi?.success(content),
  info: (content: string) => messageApi?.info(content),
  warning: (content: string) => messageApi?.warning(content),
  error: (content: string) => messageApi?.error(content),
  modal: () => modalApi,
}
