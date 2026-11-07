import { cameraLiveQuery, PTZ } from '@shared/api/camera'
import type { AppDevice } from '@shared/api/device'
import { usePtzControl } from '@shared/hooks/usePtzControl'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Selector } from 'antd-mobile'
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

export function Ptz({ id, ptz, zoom }: { id: number; ptz: boolean; zoom: boolean }) {
  const cid = useCompanyId()
  const { active, locked, speed, setSpeed, uncertain, retryStop, bindDirection } = usePtzControl({
    companyId: cid,
    deviceId: id,
    initialSpeed: 1,
    onError: showFailure,
  })

  const button = (direction: number, label: string) => (
    <button
      type="button"
      className={active === direction ? 'h5-ptz active' : locked ? 'h5-ptz locked' : 'h5-ptz'}
      key={direction}
      aria-label={label}
      disabled={locked || uncertain !== null}
      {...bindDirection(direction)}
    >
      {label}
    </button>
  )

  return (
    <div className="h5-ptz-panel">
      <div className="h5-ptz-compact">
        {ptz && (
          <div className="h5-ptz-col">
            <div className="h5-grid-two">
              {button(PTZ.UP, '↑ 向上')}
              {button(PTZ.DOWN, '↓ 向下')}
              {button(PTZ.LEFT, '← 向左')}
              {button(PTZ.RIGHT, '→ 向右')}
            </div>
          </div>
        )}
        <div className="h5-ptz-col">
          {zoom && (
            <div className="h5-grid-two">
              {button(PTZ.ZOOM_IN, '＋ 放大')}
              {button(PTZ.ZOOM_OUT, '－ 缩小')}
            </div>
          )}
          <Selector
            disabled={active !== null || locked}
            options={[
              { label: '慢', value: 0 },
              { label: '中', value: 1 },
              { label: '快', value: 2 },
            ]}
            value={[speed]}
            onChange={(v) => setSpeed((v[0] ?? 1) as 0 | 1 | 2)}
          />
        </div>
      </div>
      <p className="h5-muted" style={{ textAlign: 'center', fontSize: 11, marginTop: 6, marginBottom: 0 }}>
        {locked ? '云台调整中，稍候可继续控制…' : '按住按钮转动，松开停止'}
      </p>
      {uncertain !== null && (
        <div style={{ marginTop: 6 }}>
          <p className="h5-warning" style={{ margin: '0 0 6px 0', fontSize: 12 }}>
            停止指令未确认，请重试停止并检查摄像头。
          </p>
          <Button color="danger" block size="small" onClick={() => void retryStop()}>
            重试停止
          </Button>
        </div>
      )}
    </div>
  )
}
