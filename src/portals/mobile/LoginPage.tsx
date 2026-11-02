import { Button, Form, Input, NavBar } from 'antd-mobile'
import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { errorText } from '@/api/errors'
import { queryClient } from '@/app/queryClient'
import { login, meQuery, myCompaniesQuery } from '@/features/auth/api'
import { isPathAllowed } from '@/lib/portal'

export default function MobileLoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [busy, setBusy] = useState(false),
    lock = useRef(false),
    [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const submit = async (values: { username: string; password: string }) => {
    if (lock.current) return
    if (!values.username.trim()) {
      setError('请输入用户名')
      return
    }
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await login(values.username.trim(), values.password)
      const [me, companies] = await Promise.all([
        queryClient.ensureQueryData(meQuery),
        queryClient.ensureQueryData(myCompaniesQuery),
      ])
      const target = params.get('redirect')
      navigate(target?.startsWith('/h5/') && isPathAllowed(target, me, companies) ? target : '/h5', {
        replace: true,
      })
    } catch (e) {
      setError(errorText(e))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <div className="mobile-page mobile-login">
      <div className="mobile-topbar">
        <NavBar back={null}>智能物联网</NavBar>
      </div>
      <div className="mobile-content">
        <div className="mobile-login-art" aria-hidden="true">
          <svg viewBox="0 0 240 110" fill="none" aria-hidden="true">
            <path d="M8 80H232M30 100V15M210 100V15" stroke="currentColor" opacity=".15" />
            <path
              d="M10 65L45 65L66 32L90 80L120 40L144 56L170 26L195 52L230 25"
              stroke="currentColor"
              strokeWidth="3"
            />
            <circle cx="170" cy="26" r="7" fill="currentColor" />
          </svg>
          <span>SMART IOT · CONNECTED LIFE</span>
        </div>
        <h2>掌握每一份生长</h2>
        <p className="mobile-login-intro">登录智能物联网，随时查看园区与设备</p>
        {error && <p role="alert">{error}</p>}
        <Form
          layout="vertical"
          onFinish={submit}
          footer={
            <Button block color="primary" type="submit" loading={busy}>
              登录
            </Button>
          }
        >
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            extra={
              <Button size="mini" fill="none" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? '隐藏' : '显示'}
              </Button>
            }
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input type={showPassword ? 'text' : 'password'} autoComplete="current-password" />
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}
