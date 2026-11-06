import { ReloadOutlined } from '@ant-design/icons'
import { Button, Modal } from 'antd'
import { useVersionCheck } from '@/shared/hooks/useVersionCheck'

export function VersionUpdateDialog() {
  const { visible, countdown, reload } = useVersionCheck()

  return (
    <Modal
      open={visible}
      title={<div style={{ textAlign: 'center', width: '100%' }}>新版本发布</div>}
      width={400}
      centered
      closable={false}
      maskClosable={false}
      keyboard={false}
      footer={
        <div style={{ textAlign: 'center', width: '100%' }}>
          <Button type="primary" onClick={reload}>
            立即重新加载
          </Button>
        </div>
      }
    >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ marginBottom: 20 }}>
          <ReloadOutlined spin style={{ fontSize: 48, color: '#1677ff' }} />
        </div>
        <p style={{ fontSize: 16, color: '#606266', marginBottom: 16, lineHeight: 1.6 }}>
          检测到新版本已发布，需要重新加载页面以使用最新功能。
        </p>
        <p style={{ fontSize: 14, color: '#909399', margin: '8px 0 0' }}>
          {countdown > 0 ? `${countdown}秒后自动重新加载` : '正在重新加载...'}
        </p>
      </div>
    </Modal>
  )
}
