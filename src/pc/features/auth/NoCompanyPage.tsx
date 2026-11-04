import { Button, Result } from 'antd'
import { useNavigate } from 'react-router'
import { logout } from './api'

export default function NoCompanyPage() {
  const navigate = useNavigate()
  return (
    <div className="flex h-full items-center justify-center bg-layout">
      <Result
        status="info"
        title="暂无可用企业"
        subTitle="您尚未加入任何企业，或所属企业已停用 / 过期。请联系企业管理员或平台管理员。"
        extra={[
          <Button key="account" onClick={() => navigate('/account')}>
            个人中心
          </Button>,
          <Button
            key="logout"
            type="primary"
            onClick={async () => {
              await logout()
            }}
          >
            退出登录
          </Button>,
        ]}
      />
    </div>
  )
}
