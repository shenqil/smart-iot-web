import { login, meQuery, myCompaniesQuery } from '@shared/api/auth'
import { queryClient } from '@shared/queryClient'
import { Button, Form, NavBar } from 'antd-mobile'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { errorText } from '@/api/errors'
import { isPathAllowed } from '@/lib/portal'

function UserSvg() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function LockSvg() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function EyeSvg() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeInvisibleSvg() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}

function ClearSvg() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
      <path d="m15 9-6 6M9 9l6 6" />
    </svg>
  )
}

function AlertSvg() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

interface MobileLoginInputProps {
  id?: string
  name?: string
  type?: 'text' | 'password'
  value?: string
  onChange?: (val: string) => void
  placeholder?: string
  autoComplete?: string
  prefixIcon: React.ReactNode
  clearable?: boolean
  showPasswordToggle?: boolean
  onAnimationStart?: React.AnimationEventHandler<HTMLInputElement>
}

const MobileLoginInput = forwardRef<HTMLInputElement, MobileLoginInputProps>(
  (
    {
      id,
      name,
      type = 'text',
      value = '',
      onChange,
      placeholder,
      autoComplete,
      prefixIcon,
      clearable,
      showPasswordToggle,
      onAnimationStart,
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false)
    const [visible, setVisible] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

    const isPassword = type === 'password'
    const actualType = isPassword ? (visible ? 'text' : 'password') : type
    const hasValue = Boolean(value && value.length > 0)

    const handleClear = () => {
      onChange?.('')
      inputRef.current?.focus()
    }

    return (
      <div className={`mobile-input-box ${focused ? 'is-focused' : ''}`}>
        <span className="mobile-input-prefix">{prefixIcon}</span>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={actualType}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onAnimationStart={onAnimationStart}
          className="mobile-input-control"
        />
        {clearable && hasValue && (
          <button
            type="button"
            tabIndex={-1}
            className="mobile-input-action-btn"
            aria-label="清除内容"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
          >
            <ClearSvg />
          </button>
        )}
        {showPasswordToggle && isPassword && (
          <button
            type="button"
            tabIndex={-1}
            className="mobile-input-action-btn"
            aria-label={visible ? '隐藏密码' : '显示密码'}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeInvisibleSvg /> : <EyeSvg />}
          </button>
        )}
      </div>
    )
  },
)
MobileLoginInput.displayName = 'MobileLoginInput'

export default function MobileLoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [form] = Form.useForm()
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [error, setError] = useState('')

  const syncAutofillValues = useCallback(() => {
    const uInput = document.getElementById('username') as HTMLInputElement | null
    const pInput = document.getElementById('password') as HTMLInputElement | null
    const updates: Record<string, string> = {}
    if (uInput?.value && !form.getFieldValue('username')) {
      updates.username = uInput.value
    }
    if (pInput?.value && !form.getFieldValue('password')) {
      updates.password = pInput.value
    }
    if (Object.keys(updates).length > 0) {
      form.setFieldsValue(updates)
    }
    return {
      username: (form.getFieldValue('username') || uInput?.value || '').trim(),
      password: form.getFieldValue('password') || pInput?.value || '',
    }
  }, [form])

  useEffect(() => {
    const timers = [100, 300, 800].map((delay) =>
      setTimeout(() => {
        syncAutofillValues()
      }, delay),
    )
    return () => {
      for (const t of timers) clearTimeout(t)
    }
  }, [syncAutofillValues])

  const handleAnimationStart: React.AnimationEventHandler<HTMLInputElement> = (e) => {
    if (e.animationName === 'onAutofillStart' || (e.target as HTMLInputElement).matches(':-webkit-autofill')) {
      syncAutofillValues()
    }
  }

  const submit = async (values?: { username?: string; password?: string }) => {
    if (lock.current) return
    const synced = syncAutofillValues()
    const username = (values?.username || synced.username || '').trim()
    const password = values?.password || synced.password || ''
    if (!username) {
      setError('请输入用户名')
      return
    }
    if (!password) {
      setError('请输入密码')
      return
    }
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await login(username, password)
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

  const onFinishFailed = () => {
    const synced = syncAutofillValues()
    if (synced.username && synced.password) {
      submit(synced)
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
        {error && (
          <div role="alert" className="mobile-login-error">
            <AlertSvg />
            <span>{error}</span>
          </div>
        )}
        <div className="mobile-login-form-wrap" onSubmitCapture={syncAutofillValues}>
          <Form
            form={form}
            name="login"
            layout="vertical"
            onFinish={submit}
            onFinishFailed={onFinishFailed}
            footer={
              <Button block color="primary" type="submit" loading={busy}>
                登录
              </Button>
            }
          >
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
              <MobileLoginInput
                id="username"
                name="username"
                placeholder="请输入用户名"
                autoComplete="username"
                prefixIcon={<UserSvg />}
                clearable
                onAnimationStart={handleAnimationStart}
              />
            </Form.Item>
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <MobileLoginInput
                id="password"
                name="password"
                type="password"
                placeholder="请输入密码"
                autoComplete="current-password"
                prefixIcon={<LockSvg />}
                showPasswordToggle
                onAnimationStart={handleAnimationStart}
              />
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  )
}
