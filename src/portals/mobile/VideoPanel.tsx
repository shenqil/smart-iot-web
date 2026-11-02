import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Selector } from 'antd-mobile'
import type { EZUIKitPlayer } from 'ezuikit-js'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { cameraLiveQuery, controlPTZ, PTZ } from '@/features/camera/api'
import type { AppDevice } from '@/features/device/api'
import { useCompanyId } from '@/hooks/session'
import { Card, Failure, Loading, showFailure, useVisible } from './ui'

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
        <Button
          size="mini"
          fill="none"
          onClick={() => {
            void qc.resetQueries({ queryKey: cameraLiveQuery(cid, device.id).queryKey })
          }}
        >
          重新连接
        </Button>
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
            <Button
              block
              fill="outline"
              onClick={() => {
                box.current?.requestFullscreen?.().catch(showFailure)
              }}
            >
              全屏播放
            </Button>
            {(q.data.ptz || q.data.zoom) && (
              <Ptz key={`${cid}:${device.id}`} id={device.id} ptz={q.data.ptz} zoom={q.data.zoom} />
            )}
          </>
        )
      )}
      <p className="h5-muted">视频需要稳定网络。云台按住转动，松开停止；控制失败时请检查摄像头状态。</p>
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
  const cid = useCompanyId(),
    [speed, setSpeed] = useState<0 | 1 | 2>(1),
    [active, setActive] = useState<number | null>(null),
    [uncertain, setUncertain] = useState<number | null>(null)
  const move = useRef<{ direction: number; start: Promise<unknown>; speed: 0 | 1 | 2 } | null>(null),
    alive = useRef(true),
    stopping = useRef(false)
  const stop = useCallback(async () => {
    const current = move.current
    if (!current) return
    move.current = null
    stopping.current = true
    if (alive.current) setActive(null)
    try {
      await current.start.catch(() => {})
      const r = await controlPTZ(cid, id, { action: 'stop', direction: current.direction, speed: current.speed })
      if (r.error) throw r.error
      if (alive.current) setUncertain(null)
    } catch (e) {
      if (alive.current) setUncertain(current.direction)
      showFailure(e)
    } finally {
      stopping.current = false
    }
  }, [cid, id])
  useEffect(() => {
    alive.current = true
    const fn = () => {
      void stop()
    }
    window.addEventListener('blur', fn)
    document.addEventListener('visibilitychange', fn)
    return () => {
      alive.current = false
      window.removeEventListener('blur', fn)
      document.removeEventListener('visibilitychange', fn)
      void stop()
    }
  }, [stop])
  const start = (direction: number) => {
    if (move.current || stopping.current || uncertain !== null || document.hidden) return
    const request = controlPTZ(cid, id, { action: 'start', direction, speed })
      .then((r) => {
        if (r.error) throw r.error
      })
      .catch((e) => {
        showFailure(e)
      })
    move.current = { direction, start: request, speed }
    setActive(direction)
  }
  const button = (direction: number, label: string) => (
    <button
      type="button"
      className={active === direction ? 'h5-ptz active' : 'h5-ptz'}
      key={direction}
      aria-label={label}
      disabled={uncertain !== null}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        start(direction)
      }}
      onPointerUp={() => void stop()}
      onPointerCancel={() => void stop()}
      onLostPointerCapture={() => void stop()}
      onBlur={() => void stop()}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (['Enter', ' '].includes(e.key) && !e.repeat) {
          e.preventDefault()
          start(direction)
        }
      }}
      onKeyUp={() => void stop()}
    >
      {label}
    </button>
  )
  return (
    <div className="h5-ptz-panel">
      {ptz && (
        <div className="h5-grid-two">
          {button(PTZ.UP, '↑ 向上')}
          {button(PTZ.DOWN, '↓ 向下')}
          {button(PTZ.LEFT, '← 向左')}
          {button(PTZ.RIGHT, '→ 向右')}
        </div>
      )}
      {zoom && (
        <div className="h5-grid-two">
          {button(PTZ.ZOOM_IN, '＋ 放大')}
          {button(PTZ.ZOOM_OUT, '－ 缩小')}
        </div>
      )}
      <Selector
        disabled={active !== null}
        options={[
          { label: '慢', value: 0 },
          { label: '中', value: 1 },
          { label: '快', value: 2 },
        ]}
        value={[speed]}
        onChange={(v) => setSpeed((v[0] ?? 1) as 0 | 1 | 2)}
      />
      {uncertain !== null && (
        <>
          <p className="h5-warning">停止指令未确认，请重试停止并检查摄像头。</p>
          <Button
            color="danger"
            block
            onClick={async () => {
              try {
                const r = await controlPTZ(cid, id, { action: 'stop', direction: uncertain, speed })
                if (r.error) throw r.error
                setUncertain(null)
              } catch (e) {
                showFailure(e)
              }
            }}
          >
            重试停止
          </Button>
        </>
      )}
    </div>
  )
}
