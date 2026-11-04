import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Button, Form, Input } from 'antd'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { errorText } from '@/api/errors'
import { queryClient } from '@/app/queryClient'
import { APP_TITLE, BrandMark } from '@/components/Brand'
import { landingPath } from '@/lib/portal'
import { usePref } from '@/stores/pref'
import { login, meQuery, myCompaniesQuery } from './api'

interface LoginForm {
  username: string
  password: string
}

const FEATURES = [
  ['设备接入', '主动上报与被动轮询双网关，设备在线状态实时可见'],
  ['数据监测', '实时数据、历史曲线、日 / 月环比，一屏掌握园区环境'],
  ['远程控制', '继电器远程开关，操作结果即时回传、全程留痕'],
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onFinish = async ({ username, password }: LoginForm) => {
    setError(null)
    setLoading(true)
    try {
      await login(username.trim(), password)
      const [me, companies] = await Promise.all([
        queryClient.ensureQueryData(meQuery),
        queryClient.ensureQueryData(myCompaniesQuery),
      ])
      const { lastPortal, lastCompanyId } = usePref.getState()
      navigate(landingPath({ me, companies, redirect: params.get('redirect'), lastPortal, lastCompanyId }), {
        replace: true,
      })
    } catch (e) {
      setError(errorText(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full bg-layout">
      <aside className="relative hidden w-[44%] max-w-[640px] flex-col justify-between overflow-hidden bg-[#0b4f4a] p-12 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -bottom-40 size-[560px] rounded-full border-[56px] border-white/5 border-solid"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -bottom-10 size-[300px] rounded-full border-[40px] border-white/5 border-solid"
        />
        <div className="flex items-center gap-3 text-[#2dd4bf]">
          <BrandMark size={36} />
          <span className="font-semibold text-lg text-white">{APP_TITLE}</span>
        </div>
        <div className="relative">
          <h1 className="m-0 font-semibold text-[34px] leading-tight">
            让每一台设备
            <br />
            都被看见、被掌控
          </h1>
          <ul className="mt-10 mb-0 list-none space-y-6 p-0">
            {FEATURES.map(([title, desc]) => (
              <li key={title} className="flex gap-4">
                <span className="mt-2 size-2 shrink-0 rounded-full bg-[#2dd4bf]" />
                <div>
                  <div className="font-medium text-base">{title}</div>
                  <div className="mt-1 text-sm text-white/65">{desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-white/45 text-xs">平台管理 · 企业管理 · 数据使用</div>
      </aside>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex items-center gap-3 text-primary lg:hidden">
            <BrandMark size={32} />
            <span className="font-semibold text-fg text-lg">{APP_TITLE}</span>
          </div>
          <h2 className="m-0 font-semibold text-2xl text-fg">登录</h2>
          <p className="mt-2 mb-8 text-fg-secondary">使用平台分配的账号登录</p>
          {error && <Alert type="error" showIcon title={error} className="mb-6" />}
          <Form<LoginForm> layout="vertical" size="large" onFinish={onFinish} requiredMark={false} autoComplete="on">
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input prefix={<UserOutlined className="text-fg-tertiary" />} autoComplete="username" autoFocus />
            </Form.Item>
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined className="text-fg-tertiary" />} autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} className="mt-2">
              登录
            </Button>
          </Form>
        </div>
      </main>
    </div>
  )
}
