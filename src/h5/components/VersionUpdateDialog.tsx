import { Modal, SpinLoading } from 'antd-mobile'
import { useVersionCheck } from '@/shared/hooks/useVersionCheck'
import { mobileContainer } from './feedback'

export function VersionUpdateDialog() {
  const { visible, countdown, reload } = useVersionCheck()

  return (
    <Modal
      visible={visible}
      getContainer={mobileContainer}
      title="新版本发布"
      closeOnMaskClick={false}
      closeOnAction={false}
      showCloseButton={false}
      content={
        <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <SpinLoading color="primary" style={{ '--size': '44px' }} />
          </div>
          <p style={{ fontSize: 15, color: '#333', marginBottom: 12, lineHeight: 1.5 }}>
            检测到新版本已发布，需要重新加载页面以使用最新功能。
          </p>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
            {countdown > 0 ? `${countdown}秒后自动重新加载` : '正在重新加载...'}
          </p>
        </div>
      }
      actions={[
        {
          key: 'reload',
          text: '立即重新加载',
          primary: true,
          onClick: reload,
        },
      ]}
    />
  )
}
