import { Button, ErrorBlock, NavBar } from 'antd-mobile'
import { logout } from '@/features/auth/api'

export default function MobileNoCompanyPage() {
  return (
    <div className="mobile-page">
      <div className="mobile-topbar">
        <NavBar back={null}>智能物联网</NavBar>
      </div>
      <div className="mobile-content">
        <ErrorBlock status="empty" title="暂无可访问的企业" description="请联系企业管理员确认企业成员与访问权限" />
        <Button block onClick={() => logout()}>
          退出登录
        </Button>
      </div>
    </div>
  )
}
