import { Button, Form, Input, NavBar } from 'antd-mobile'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { errorText } from '@/api/errors'
import { queryClient } from '@/app/queryClient'
import { login, meQuery, myCompaniesQuery } from '@/features/auth/api'
import { isPathAllowed } from '@/lib/portal'

export default function MobileLoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (values: { username: string; password: string }) => {
    if (busy) return
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
      setBusy(false)
    }
  }
  return (
    <div className="mobile-page">
      <div className="mobile-topbar">
        <NavBar back={null}>智能物联网</NavBar>
      </div>
      <div className="mobile-content">
        <h2>登录</h2>
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
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input type="password" autoComplete="current-password" />
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}
