import { ConfigProvider, Dialog, Toast } from 'antd-mobile'
import zhCN from 'antd-mobile/es/locales/zh-CN'
import { type ReactNode, useEffect } from 'react'
import { bindNotify, type NoticeDialog } from './notify'
import './mobile.css'
import './react19-mobile'

function FeedbackBridge() {
  useEffect(() => {
    const getContainer = () => document.querySelector('.mobile-root') as HTMLElement
    const dialog = (options: NoticeDialog, confirm: boolean) => {
      Dialog.show({
        getContainer,
        title: options.title,
        content: options.content,
        closeOnAction: true,
        actions: [
          ...(confirm
            ? [
                {
                  key: 'cancel',
                  text: options.cancelText ?? '取消',
                  onClick: async () => {
                    await options.onCancel?.()
                  },
                },
              ]
            : []),
          {
            key: 'ok',
            text: options.okText ?? '确定',
            bold: true,
            danger: options.okButtonProps?.danger,
            onClick: async () => {
              await options.onOk?.()
            },
          },
        ],
        afterClose: options.afterClose,
      })
    }
    const unbind = bindNotify({
      success: (content) => {
        Toast.show({ getContainer, content, icon: 'success' })
      },
      info: (content) => {
        Toast.show({ getContainer, content })
      },
      warning: (content) => {
        Toast.show({ getContainer, content })
      },
      error: (content) => {
        Toast.show({ getContainer, content, icon: 'fail' })
      },
      modal: { confirm: (options) => dialog(options, true), warning: (options) => dialog(options, false) },
    })
    return () => {
      unbind()
      Dialog.clear()
      Toast.clear()
    }
  }, [])
  return null
}

export default function MobileProviders({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider locale={zhCN}>
      <div className="mobile-root">
        <FeedbackBridge />
        {children}
      </div>
    </ConfigProvider>
  )
}
