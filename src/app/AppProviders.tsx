import { StyleProvider } from '@ant-design/cssinjs'
import { QueryClientProvider } from '@tanstack/react-query'
import { App, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { type ReactNode, useEffect } from 'react'
import { bindNotify } from './notify'
import { queryClient } from './queryClient'
import { lightTheme } from './theme'
import '@/lib/time'

function AppBridge() {
  const { message, modal } = App.useApp()
  useEffect(() => bindNotify(message, modal), [message, modal])
  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <StyleProvider layer>
      <ConfigProvider locale={zhCN} theme={lightTheme}>
        <App className="h-full">
          <AppBridge />
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </App>
      </ConfigProvider>
    </StyleProvider>
  )
}
