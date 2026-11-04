import { StyleProvider } from '@ant-design/cssinjs'
import { App, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { type ReactNode, useEffect } from 'react'
import { bindNotify } from '@/shared/notify'
import { lightTheme } from './theme'
import '@/shared/lib/time'

function AppBridge() {
  const { message, modal } = App.useApp()
  useEffect(
    () =>
      bindNotify({
        success: (content) => {
          void message.success(content)
        },
        info: (content) => {
          void message.info(content)
        },
        warning: (content) => {
          void message.warning(content)
        },
        error: (content) => {
          void message.error(content)
        },
        modal: {
          confirm: (options) => {
            modal.confirm(options)
          },
          warning: (options) => {
            modal.warning(options)
          },
        },
      }),
    [message, modal],
  )
  return null
}

export default function DesktopProviders({ children }: { children: ReactNode }) {
  return (
    <StyleProvider layer>
      <ConfigProvider locale={zhCN} theme={lightTheme}>
        <App className="h-full">
          <AppBridge />
          {children}
        </App>
      </ConfigProvider>
    </StyleProvider>
  )
}
