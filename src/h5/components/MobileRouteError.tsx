import { Button, ErrorBlock } from 'antd-mobile'
import { useNavigate, useRouteError } from 'react-router'
import { errorText } from '@/api/errors'

export function MobileRouteError() {
  const error = useRouteError()
  const navigate = useNavigate()
  return (
    <div className="mobile-content">
      <ErrorBlock title="暂时无法打开页面" description={errorText(error)} />
      <Button block onClick={() => navigate('/h5', { replace: true })}>
        返回首页
      </Button>
    </div>
  )
}
export function MobileNotFound({ onHome }: { onHome: () => void }) {
  return (
    <div className="mobile-content">
      <ErrorBlock status="empty" title="页面不存在" />
      <Button block onClick={onHome}>
        返回首页
      </Button>
    </div>
  )
}
