import { authKeys, logout } from '@shared/api/auth'
import { appDeviceSummaryQuery } from '@shared/api/device'
import { useDeviceTypes } from '@shared/api/dict'
import { appSitesQuery } from '@shared/api/site'
import { channelName, isVideoDeviceType } from '@shared/telemetry/lib/realtime'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, Button, Form, Input, List, ProgressBar } from 'antd-mobile'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { api, unwrap } from '@/api/client'
import { useCompanyId, useCurrentCompany, useMe, useMyCompanies } from '@/hooks/session'
import { companyDenyReason } from '@/lib/portal'
import { dayjs, fmtDate, fmtDateTime } from '@/lib/time'
import { useSession } from '@/stores/session'
import { SitePreview } from '../components/SiteCard'
import { appCompanyQuery, manageableCompanyQuery, mobileDeviceQuery } from '../api'
import { positiveId } from '../filters'
import { preferenceKey, useMobilePreferences } from '../preferences'
import {
  Card,
  DetailList,
  mobileDialog as Dialog,
  Empty,
  Failure,
  Loading,
  Page,
  SectionHeading,
  StatusTag,
  showFailure,
  mobileToast as Toast,
} from '../ui'

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
        <p className="h5-muted">
          {company?.role === 'admin' ? '企业管理员' : '企业成员'}
          {company?.joinedAt ? ` · ${fmtDate(company.joinedAt)} 加入` : ''}
        </p>
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
              Toast.show({ content: '密码已修改', duration: 3500 })
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
function companyStanding(status: string | undefined, expiredAt: string | null | undefined) {
  const inactive = status === 'inactive'
  const days = expiredAt ? dayjs(expiredAt).diff(dayjs(), 'day', true) : null
  const expired = days != null && days <= 0
  const soon = days != null && days > 0 && days <= 30
  return {
    label: inactive ? '已停用' : '正常',
    tone: inactive || expired ? 'danger' : soon ? 'warning' : 'success',
    expiry: !expiredAt
      ? '长期有效'
      : expired
        ? `已于 ${fmtDate(expiredAt)} 过期`
        : soon
          ? `有效期至 ${fmtDate(expiredAt)} · 剩 ${Math.ceil(days)} 天`
          : `有效期至 ${fmtDate(expiredAt)}`,
  } as const
}

function CompanyInfo() {
  const company = useCurrentCompany(),
    cid = useCompanyId(),
    base = `/h5/${cid}`,
    summary = useQuery(appDeviceSummaryQuery(cid)),
    sites = useQuery(appSitesQuery(cid)),
    appProfile = useQuery({ ...appCompanyQuery(cid), retry: false, meta: { silent: true } }),
    tenantProfile = useQuery({
      ...manageableCompanyQuery(cid),
      enabled: company?.manageable === true && appProfile.isError,
      retry: false,
    }),
    profile = appProfile.data ?? tenantProfile.data,
    name = profile?.name || company?.name || '当前企业',
    logo = profile?.logo || company?.logo,
    standing = companyStanding(profile?.status ?? company?.status, profile ? profile.expiredAt : company?.expiredAt),
    description = profile?.description.trim() ?? '',
    contact = [
      profile?.contactPerson.trim() ? { label: '联系人', value: profile.contactPerson.trim() } : null,
      profile?.contactPhone.trim()
        ? {
            label: '电话',
            value: (
              <a className="h5-inline-link" href={`tel:${profile.contactPhone.replace(/[^\d+]/g, '')}`}>
                {profile.contactPhone.trim()}
              </a>
            ),
          }
        : null,
      profile?.contactEmail.trim()
        ? {
            label: '邮箱',
            value: (
              <a className="h5-inline-link" href={`mailto:${profile.contactEmail.trim()}`}>
                {profile.contactEmail.trim()}
              </a>
            ),
          }
        : null,
      profile?.address.trim() ? { label: '地址', value: profile.address.trim() } : null,
    ].filter((item) => item != null)
  return (
    <Page title="企业资料">
      <Card className="h5-company-profile h5-overview">
        <div className="h5-company">
          <span className="h5-company-mark">{logo ? <img src={logo} alt="" /> : name.slice(0, 1)}</span>
          <div>
            <strong>{name}</strong>
            <div className="h5-company-tags">
              <StatusTag tone={standing.tone}>{standing.label}</StatusTag>
              <small>{standing.expiry}</small>
            </div>
          </div>
        </div>
        {description && <p className="h5-company-desc">{description}</p>}
        <div className="h5-company-stats">
          <Link to={`${base}/sites`}>
            <strong>{summary.data?.siteCount ?? '—'}</strong>
            <span>园区</span>
          </Link>
          <Link to={`${base}/devices`}>
            <strong>{summary.data?.deviceCount ?? '—'}</strong>
            <span>设备</span>
          </Link>
          {profile && (
            <div>
              <strong>{profile.memberCount}</strong>
              <span>成员</span>
            </div>
          )}
        </div>
        {profile && <p className="h5-muted h5-company-note">创建于 {fmtDate(profile.createdAt)}</p>}
      </Card>
      {contact.length > 0 && (
        <Card title="联系方式">
          <DetailList items={contact} />
        </Card>
      )}
      <SectionHeading title="企业园区" extra={<Link to={`${base}/sites`}>全部园区 ›</Link>} />
      {sites.isPending ? (
        <Loading />
      ) : sites.isError ? (
        <Failure
          error={sites.error}
          retry={() => {
            void sites.refetch()
          }}
        />
      ) : !sites.data?.length ? (
        <Empty title="暂无园区" />
      ) : (
        sites.data.slice(0, 6).map((site) => <SitePreview key={site.id} site={site} />)
      )}
    </Page>
  )
}
function DeviceInfo() {
  const cid = useCompanyId(),
    types = useDeviceTypes(),
    [params] = useSearchParams(),
    id = positiveId(params.get('deviceId')),
    q = useQuery({ ...mobileDeviceQuery(cid, id ?? 0), enabled: !!id }),
    d = q.data
  const isVideo = isVideoDeviceType(types.nameOf(d?.deviceTypeId))
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
              {!isVideo && <List.Item extra={`${d.readInterval} 秒`}>采集周期</List.Item>}
              {!isVideo && <List.Item extra={`${d.sensors.length} 路`}>传感器</List.Item>}
              {!isVideo && <List.Item extra={`${d.relays.length} 路`}>继电器</List.Item>}
              <List.Item extra={d.longitude != null && d.latitude != null ? `${d.longitude}, ${d.latitude}` : '未配置'}>
                位置
              </List.Item>
            </List>
            <p>{d.description || '暂无设备介绍'}</p>
            {!isVideo && !!d.sensors.length && (
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
            {!isVideo && !!d.relays.length && (
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
