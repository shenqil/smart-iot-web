import { cameraLiveQuery, PTZ } from '@shared/api/camera'
import type { AppDevice } from '@shared/api/device'
import { type Speed, usePtzControl } from '@shared/hooks/usePtzControl'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from 'antd-mobile'
import type { EZUIKitPlayer } from 'ezuikit-js'
import { useEffect, useId, useRef, useState } from 'react'
import { useCompanyId } from '@/hooks/session'
import { Card, Failure, Loading, showFailure, useVisible } from '../ui'

export default function VideoPanel({ device }: { device: AppDevice }) {
  const cid = useCompanyId(),
    qc = useQueryClient(),
    visible = useVisible(),
    q = useQuery({ ...cameraLiveQuery(cid, device.id), enabled: visible }),
    box = useRef<HTMLDivElement>(null)
  return (
    <Card
      title="实时视频"
      extra={
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Button
            size="mini"
            fill="none"
            onClick={() => {
              void qc.resetQueries({ queryKey: cameraLiveQuery(cid, device.id).queryKey })
            }}
          >
            重新连接
          </Button>
          <Button
            size="mini"
            fill="outline"
            onClick={() => {
              box.current?.requestFullscreen?.().catch(showFailure)
            }}
          >
            全屏播放
          </Button>
        </div>
      }
    >
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <Failure
          error={q.error}
          retry={() => {
            void q.refetch()
          }}
        />
      ) : (
        q.data && (
          <>
            <div ref={box} className="h5-video">
              {visible ? (
                q.data.provider === 'ezviz' ? (
                  <Ezviz url={q.data.url} token={q.data.accessToken ?? ''} />
                ) : (
                  <video
                    src={q.data.url}
                    controls
                    autoPlay
                    muted
                    playsInline
                    onError={() => showFailure(new Error('直播地址无法播放，请重连或检查浏览器支持的编码'))}
                  />
                )
              ) : (
                <p>页面已隐藏，暂停视频取流</p>
              )}
            </div>
            {(q.data.ptz || q.data.zoom) && (
              <Ptz key={`${cid}:${device.id}`} id={device.id} ptz={q.data.ptz} zoom={q.data.zoom} />
            )}
          </>
        )
      )}
    </Card>
  )
}

function Ezviz({ url, token }: { url: string; token: string }) {
  const id = `mobile-video-${useId().replace(/[^\w-]/g, '')}`,
    ref = useRef<HTMLDivElement>(null),
    [error, setError] = useState('')
  useEffect(() => {
    let dead = false,
      player: EZUIKitPlayer | undefined
    const box = ref.current
    if (!box) return
    const observer = new ResizeObserver(() => {
      const w = box.clientWidth
      if (w) player?.resize(w, (w * 9) / 16)
    })
    void import('ezuikit-js')
      .then(({ EZUIKitPlayer }) => {
        if (dead) return
        player = new EZUIKitPlayer({
          id,
          url,
          accessToken: token,
          width: box.clientWidth,
          height: (box.clientWidth * 9) / 16,
          template: 'mobileLive',
          audio: false,
          language: 'zh',
          handleError: (e) => {
            if (!dead) setError(e?.msg || '播放失败，请重新连接')
          },
        })
        observer.observe(box)
      })
      .catch(() => !dead && setError('播放器加载失败，请重新连接'))
    return () => {
      dead = true
      observer.disconnect()
      try {
        Promise.resolve(player?.destroy()).catch(() => {})
      } catch {
        /* SDK teardown */
      }
    }
  }, [id, url, token])
  return (
    <div ref={ref}>
      <div id={id} />
      {error && (
        <p role="alert" className="h5-warning">
          {error}
        </p>
      )}
    </div>
  )
}

const SPEEDS: { value: Speed; label: string }[] = [
  { value: 0, label: '慢' },
  { value: 1, label: '中' },
  { value: 2, label: '快' },
]

export function Ptz({ id, ptz, zoom }: { id: number; ptz: boolean; zoom: boolean }) {
  const cid = useCompanyId()
  const { active, locked, speed, setSpeed, uncertain, retryStop, bindDirection } = usePtzControl({
    companyId: cid,
    deviceId: id,
    initialSpeed: 1,
    onError: showFailure,
  })
  const blocked = locked || uncertain !== null
  const hold = (direction: number, label: string, symbol: string, place?: string) => (
    <button
      type="button"
      key={direction}
      aria-label={label}
      disabled={blocked}
      className={[place, active === direction ? 'active' : undefined].filter(Boolean).join(' ') || undefined}
      {...bindDirection(direction)}
    >
      {symbol}
    </button>
  )

  return (
    <div className="h5-ptz-panel">
      <div className="h5-ptz-band">
        {ptz && (
          <div className="h5-ptz-pad">
            {hold(PTZ.UP, '向上', '↑', 'up')}
            {hold(PTZ.LEFT, '向左', '←', 'left')}
            {hold(PTZ.RIGHT, '向右', '→', 'right')}
            {hold(PTZ.DOWN, '向下', '↓', 'down')}
            <span className={active != null ? 'h5-ptz-hub live' : 'h5-ptz-hub'} />
          </div>
        )}
        {zoom && (
          <div className="h5-zoom-rocker">
            {hold(PTZ.ZOOM_IN, '放大', '＋')}
            {hold(PTZ.ZOOM_OUT, '缩小', '－')}
          </div>
        )}
      </div>
      <div className="h5-ptz-speed" role="group" aria-label="速度">
        {SPEEDS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={speed === item.value}
            disabled={active !== null || locked}
            onClick={() => setSpeed(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="h5-ptz-hint">{locked ? '云台调整中，稍候可继续控制…' : '按住方向键转动，松开停止'}</p>
      {uncertain !== null && (
        <div className="h5-ptz-alert">
          <p>停止指令未确认，请重试停止并检查摄像头。</p>
          <Button color="danger" block size="small" onClick={() => void retryStop()}>
            重试停止
          </Button>
        </div>
      )}
    </div>
  )
}
