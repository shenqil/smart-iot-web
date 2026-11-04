import { authKeys, logout } from '@shared/api/auth'
import { appSitesQuery } from '@shared/api/site'
import { channelName } from '@shared/telemetry/lib/realtime'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, Button, Form, Input, List, ProgressBar } from 'antd-mobile'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { api, unwrap } from '@/api/client'
import { useCompanyId, useCurrentCompany, useMe, useMyCompanies } from '@/hooks/session'
import { companyDenyReason } from '@/lib/portal'
import { fmtDateTime } from '@/lib/time'
import { useSession } from '@/stores/session'
import { mobileDeviceQuery } from '../api'
import { positiveId } from '../filters'
import { preferenceKey, useMobilePreferences } from '../preferences'
import { Card, mobileDialog as Dialog, Empty, Failure, Loading, Page, showFailure, mobileToast as Toast } from '../ui'

export default function AccountPages() {
  const path = useLocation().pathname.split('/').at(-1)
  return path === 'profile' ? (
    <Profile />
  ) : path === 'password' ? (
    <Password />
  ) : path === 'company-info' ? (
    <CompanyInfo />
  ) : path === 'device-info' ? (
    <DeviceInfo />
  ) : (
    <Me />
  )
}
function Me() {
  const cid = useCompanyId(),
    me = useMe(),
    company = useCurrentCompany(),
    companies = useMyCompanies(),
    navigate = useNavigate(),
    entry = useMobilePreferences((s) => s.entries[preferenceKey(me.id, cid)]),
    base = `/h5/${cid}`
  return (
    <Page title="我的" back={false}>
      <div className="h5-account-hero">
        <Avatar src={me.avatar || ''} style={{ '--size': '64px', '--border-radius': '22px' }} />
        <h1>{me.nickname || me.username}</h1>
        <p>{me.phone || '尚未填写手机号'}</p>
        <Link to={`${base}/profile`}>编辑个人资料 ›</Link>
      </div>
      <Card>
        <List>
          <List.Item onClick={() => navigate(`${base}/devices?mode=favorites`)} extra={entry?.favorites.length ?? 0}>
            我的关注
          </List.Item>
          <List.Item onClick={() => navigate(`${base}/devices?mode=recent`)}>最近访问</List.Item>
          <List.Item onClick={() => navigate(`${base}/operations`)}>操作记录</List.Item>
          <List.Item onClick={() => navigate(`${base}/password`)}>修改密码</List.Item>
        </List>
      </Card>
      <Card title="当前企业" extra={<Link to={`${base}/company-info`}>查看资料 ›</Link>}>
        <h3>{company?.name}</h3>
        <p className="h5-muted">{company?.role === 'admin' ? '企业管理员' : '企业成员'}</p>
        <List>
          {companies.map((c) => (
            <List.Item
              key={c.companyId}
              disabled={!c.accessible}
              onClick={() => navigate(`/h5/${c.companyId}/home`, { replace: true })}
              extra={c.companyId === cid ? '当前' : c.accessible ? '切换' : companyDenyReason('app', c)}
            >
              {c.name}
            </List.Item>
          ))}
        </List>
      </Card>
      <Button
        block
        color="danger"
        fill="none"
        onClick={async () => {
          if (await Dialog.confirm({ title: '退出登录', content: '确认退出当前账号？' })) await logout()
        }}
      >
        退出登录
      </Button>
    </Page>
  )
}
function Profile() {
  const me = useMe(),
    qc = useQueryClient(),
    [avatar, setAvatar] = useState(me.avatar || ''),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState<number | null>(null),
    abort = useRef<AbortController | null>(null),
    alive = useRef(true),
    lock = useRef(false)
  const [form] = Form.useForm()
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      abort.current?.abort()
    }
  }, [])
  const upload = async (file: File) => {
    if (abort.current || lock.current) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      Toast.show('仅支持 JPG、PNG、WebP 图片')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      Toast.show('头像不能超过 5 MB')
      return
    }
    const ctrl = new AbortController()
    abort.current = ctrl
    setProgress(0)
    try {
      const policy = await unwrap(
        api.POST('/api/v1/common/oss/upload-policy', {
          body: { scene: 'avatar', contentType: file.type as 'image/jpeg', size: file.size },
          signal: ctrl.signal,
        }),
      )
      const body = new FormData()
      for (const [k, v] of Object.entries(policy.fields)) body.append(k, v)
      body.append('file', file)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const cancel = () => xhr.abort()
        ctrl.signal.addEventListener('abort', cancel, { once: true })
        xhr.upload.onprogress = (e) => {
          if (alive.current && e.lengthComputable) setProgress((e.loaded / e.total) * 100)
        }
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`上传失败 (${xhr.status})`))
        xhr.onerror = () => reject(new Error('上传失败，请检查网络及 OSS 跨域配置'))
        xhr.onabort = () => reject(new DOMException('已取消', 'AbortError'))
        xhr.onloadend = () => ctrl.signal.removeEventListener('abort', cancel)
        xhr.open('POST', policy.host)
        if (ctrl.signal.aborted) {
          reject(new DOMException('已取消', 'AbortError'))
          return
        }
        xhr.send(body)
      })
      if (alive.current && !ctrl.signal.aborted) setAvatar(policy.url)
    } catch (e) {
      if (!ctrl.signal.aborted) showFailure(e)
    } finally {
      abort.current = null
      if (alive.current) setProgress(null)
    }
  }
  return (
    <Page title="个人资料">
      <Card>
        <div className="h5-avatar-editor">
          <Avatar src={avatar} style={{ '--size': '80px' }} />
          <label className="h5-upload">
            更换头像
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy || progress !== null}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void upload(file)
              }}
            />
          </label>
          <Button size="small" fill="none" disabled={busy || progress !== null} onClick={() => setAvatar('')}>
            移除头像
          </Button>
        </div>
        {progress !== null && (
          <>
            <ProgressBar percent={progress} />
            <Button size="small" onClick={() => abort.current?.abort()}>
              取消上传
            </Button>
          </>
        )}
        <p className="h5-muted">用户名 {me.username} · 图片 JPG / PNG / WebP，最多 5 MB</p>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ nickname: me.nickname, phone: me.phone ?? '' }}
          onFinish={async (v) => {
            if (lock.current || abort.current) return
            lock.current = true
            const requestToken = useSession.getState().token
            setBusy(true)
            try {
              const user = await unwrap(
                api.PUT('/api/v1/auth/me', { body: { nickname: v.nickname ?? '', phone: v.phone ?? '', avatar } }),
              )
              if (useSession.getState().token !== requestToken) return
              qc.setQueryData(authKeys.me, user)
              Toast.show({ icon: 'success', content: '资料已保存' })
            } catch (e) {
              showFailure(e)
            } finally {
              lock.current = false
              if (alive.current) setBusy(false)
            }
          }}
          footer={
            <Button block color="primary" type="submit" loading={busy} disabled={progress !== null}>
              保存资料
            </Button>
          }
        >
          <Form.Item name="nickname" label="昵称" rules={[{ max: 50, message: '昵称最多 50 个字符' }]}>
            <Input maxLength={50} placeholder="操作记录中显示的名字" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[{ pattern: /^(\+?[0-9-]{5,20})?$/, message: '手机号格式不正确' }]}
          >
            <Input type="tel" maxLength={20} />
          </Form.Item>
        </Form>
      </Card>
    </Page>
  )
}
function Password() {
  const qc = useQueryClient(),
    [form] = Form.useForm(),
    [busy, setBusy] = useState(false),
    lock = useRef(false)
  return (
    <Page title="修改密码">
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            if (lock.current) return
            lock.current = true
            const requestToken = useSession.getState().token
            setBusy(true)
            try {
              const result = await unwrap(
                api.PUT('/api/v1/auth/me/password', {
                  body: { oldPassword: v.oldPassword, newPassword: v.newPassword },
                }),
              )
              if (useSession.getState().token !== requestToken) return
              useSession.getState().setSession(result.token, result.expiresAt)
              if (result.user) qc.setQueryData(authKeys.me, result.user)
              form.resetFields()
              Toast.show({ content: '密码已修改，其他设备登录已失效', duration: 3500 })
            } catch (e) {
              showFailure(e)
            } finally {
              lock.current = false
              setBusy(false)
            }
          }}
          footer={
            <Button block type="submit" color="primary" loading={busy}>
              修改密码
            </Button>
          }
        >
          <Form.Item name="oldPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
            <Input type="password" autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true },
              { pattern: /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/, message: '8–64 个字符，须包含字母和数字' },
            ]}
          >
            <Input type="password" maxLength={64} autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="确认密码"
            dependencies={['newPassword']}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator: (_, v) =>
                  v === getFieldValue('newPassword') ? Promise.resolve() : Promise.reject(new Error('两次密码不一致')),
              }),
            ]}
          >
            <Input type="password" autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Card>
    </Page>
  )
}
function CompanyInfo() {
  const company = useCurrentCompany(),
    cid = useCompanyId(),
    sites = useQuery(appSitesQuery(cid))
  return (
    <Page title="企业资料">
      <Card title={company?.name}>
        <List>
          <List.Item extra={company?.role === 'admin' ? '管理员' : '成员'}>我的角色</List.Item>
          <List.Item extra={company?.status === 'active' ? '正常' : company?.status}>企业状态</List.Item>
          <List.Item extra={company?.expiredAt ? fmtDateTime(company.expiredAt) : '长期有效'}>有效期</List.Item>
          <List.Item extra={fmtDateTime(company?.joinedAt)}>加入时间</List.Item>
        </List>
        <p className="h5-muted">资料由企业管理员维护</p>
      </Card>
      <Card title="企业园区">
        {sites.isPending ? (
          <Loading />
        ) : sites.isError ? (
          <Failure error={sites.error} retry={() => void sites.refetch()} />
        ) : (
          sites.data?.map((s) => (
            <Link key={s.id} className="h5-list-link" to={`/h5/${cid}/sites/${s.id}`}>
              {s.name} ›
            </Link>
          ))
        )}
      </Card>
    </Page>
  )
}
function DeviceInfo() {
  const cid = useCompanyId(),
    [params] = useSearchParams(),
    id = positiveId(params.get('deviceId')),
    q = useQuery({ ...mobileDeviceQuery(cid, id ?? 0), enabled: !!id }),
    d = q.data
  return (
    <Page title="设备资料">
      {!id ? (
        <Empty title="请选择设备" />
      ) : q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <Failure error={q.error} retry={() => void q.refetch()} />
      ) : (
        d && (
          <Card title={d.name}>
            <List>
              <List.Item extra={d.deviceSn}>设备 SN</List.Item>
              <List.Item extra={d.status}>状态</List.Item>
              <List.Item extra={`${d.readInterval} 秒`}>采集周期</List.Item>
              <List.Item extra={`${d.sensors.length} 路`}>传感器</List.Item>
              <List.Item extra={`${d.relays.length} 路`}>继电器</List.Item>
              <List.Item extra={d.hasCamera ? '已配置' : '未配置'}>摄像头</List.Item>
              <List.Item extra={d.longitude != null && d.latitude != null ? `${d.longitude}, ${d.latitude}` : '未配置'}>
                位置
              </List.Item>
            </List>
            <p>{d.description || '暂无设备介绍'}</p>
            {!!d.sensors.length && (
              <>
                <h3>传感器通道</h3>
                {d.sensors.map((sensor) => (
                  <div className="h5-list-link" key={sensor.channel}>
                    <strong>{channelName(sensor)}</strong>
                    <p className="h5-muted">
                      通道 {sensor.channel} · 单位 {sensor.unit || '无'} · 量程 {sensor.rangeMin} — {sensor.rangeMax} ·
                      分辨率 {sensor.resolution || '未配置'}
                    </p>
                  </div>
                ))}
              </>
            )}
            {!!d.relays.length && (
              <>
                <h3>继电器通道</h3>
                {d.relays.map((relay) => (
                  <div className="h5-list-link" key={relay.channel}>
                    {channelName(relay)} · 通道 {relay.channel}
                  </div>
                ))}
              </>
            )}
            <p className="h5-muted">资料更新 {fmtDateTime(d.updatedAt)} · 设备配置及园区挂载关系由管理员维护。</p>
          </Card>
        )
      )}
    </Page>
  )
}
