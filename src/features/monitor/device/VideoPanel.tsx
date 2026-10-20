import { ExportOutlined, ReloadOutlined, VideoCameraOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Spin } from 'antd'
import { useState } from 'react'
import { errorText, isApiError } from '@/api/errors'
import { cameraLiveQuery } from '@/features/camera/api'
import { EzvizPlayer } from '@/features/camera/EzvizPlayer'
import { PtzPanel } from '@/features/camera/PtzPanel'
import type { AppDevice } from '@/features/device/api'
import { useCompanyId } from '@/hooks/session'

/** 播放区域内的提示 (加载中 / 未配置 / 出错)，保持 16:9 */
function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-md bg-[#1b2430] px-6 text-center text-white/70">
      {children}
    </div>
  )
}

/**
 * 视频监控设备：实时画面 + 云台控制
 * 萤石云摄像头用 EZUIKit 播放 (accessToken 由后端换取)；只配置了直播地址的用 <video> 直接播放
 */
export function VideoPanel({ device }: { device: AppDevice }) {
  const companyId = useCompanyId()
  const live = useQuery(cameraLiveQuery(companyId, device.id))
  const v = live.data
  const controls = v?.provider === 'ezviz' && (v.ptz || v.zoom)

  let screen: React.ReactNode
  if (live.isPending) {
    screen = (
      <Screen>
        <Spin />
        <span className="text-sm">正在获取播放地址…</span>
      </Screen>
    )
  } else if (live.isError) {
    const notConfigured = isApiError(live.error) && live.error.code === 'CAMERA_NOT_CONFIGURED'
    screen = (
      <Screen>
        <VideoCameraOutlined className="text-5xl text-white/40" />
        <div className="text-base text-white/80">{notConfigured ? '该设备还没有配置摄像头' : '无法播放'}</div>
        <div className="max-w-md text-sm">
          {notConfigured ? '请联系企业管理员在设备配置的"摄像头"页签中填写萤石云信息' : errorText(live.error)}
        </div>
        {!notConfigured && (
          <Button size="small" icon={<ReloadOutlined />} onClick={() => live.refetch()}>
            重试
          </Button>
        )}
      </Screen>
    )
  } else if (v?.provider === 'ezviz' && v.accessToken) {
    screen = <EzvizPlayer url={v.url} accessToken={v.accessToken} />
  } else if (v) {
    screen = <UrlPlayer url={v.url} />
  }

  return (
    <Card variant="borderless" title="实时画面">
      <div className={controls ? 'grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_260px]' : ''}>
        <div className="mx-auto w-full max-w-[calc(72vh*16/9)]">{screen}</div>
        {controls && v && (
          <div className="rounded-lg border border-line border-solid px-4 py-5">
            <div className="mb-4 font-medium">云台控制</div>
            <PtzPanel deviceId={device.id} ptz={v.ptz} zoom={v.zoom} />
          </div>
        )}
      </div>
    </Card>
  )
}

/** 直播地址：浏览器能直接播放的 (如 Safari 的 HLS、MP4) 用 <video>，否则提示在新窗口打开 */
function UrlPlayer({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)
  if (failed)
    return (
      <Screen>
        <VideoCameraOutlined className="text-5xl text-white/40" />
        <div className="text-base text-white/80">当前浏览器无法直接播放该直播地址</div>
        <Button size="small" icon={<ExportOutlined />} href={url} target="_blank" rel="noreferrer">
          在新窗口打开
        </Button>
      </Screen>
    )
  return (
    <video
      src={url}
      controls
      autoPlay
      muted
      playsInline
      className="aspect-video w-full rounded-md bg-black"
      onError={() => setFailed(true)}
    />
  )
}
