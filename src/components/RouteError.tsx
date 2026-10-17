import { Button, Result } from 'antd'
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router'
import { errorText, isApiError } from '@/api/errors'

export function RouteError() {
  const error = useRouteError()
  const navigate = useNavigate()
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundResult onHome={() => navigate('/')} />
  }
  const notFound = isApiError(error) && error.status === 404
  return (
    <div className="flex h-full items-center justify-center">
      <Result
        status={notFound ? '404' : 'error'}
        title={notFound ? '数据不存在或无权访问' : '页面出错了'}
        subTitle={notFound ? undefined : errorText(error)}
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            返回首页
          </Button>
        }
      />
    </div>
  )
}

export function NotFoundResult({ onHome }: { onHome: () => void }) {
  return (
    <div className="flex h-full items-center justify-center">
      <Result
        status="404"
        title="页面不存在"
        extra={
          <Button type="primary" onClick={onHome}>
            返回首页
          </Button>
        }
      />
    </div>
  )
}
