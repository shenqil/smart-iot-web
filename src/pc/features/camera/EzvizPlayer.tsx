import { ReloadOutlined, VideoCameraOutlined } from '@ant-design/icons'
import { Button, Spin } from 'antd'
import type { EZUIKitPlayer } from 'ezuikit-js'
import { useEffect, useId, useRef, useState } from 'react'

/** loading：正在加载 SDK；ready：播放器已创建 (取流中的加载与错误由 SDK 模板自己显示)；error：SDK 加载失败或初始化报错 */
type Status = { kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; message: string }

/**
 * 萤石 EZUIKit 播放器 (ezopen 地址 + accessToken)
 * - SDK 约 3 MB，进入视频设备时才加载；解码库默认取萤石 CDN
 * - 宽度随容器变化，按 16:9 计算高度；卸载时销毁实例 (停止取流)
 */
export function EzvizPlayer({ url, accessToken }: { url: string; accessToken: string }) {
  const id = `ezuikit-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const boxRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt 用于手动重试
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    let player: EZUIKitPlayer | null = null
    let ro: ResizeObserver | null = null
    let disposed = false
    setStatus({ kind: 'loading' })
    const size = () => {
      const w = Math.max(320, Math.floor(box.clientWidth))
      return [w, Math.round((w * 9) / 16)] as const
    }

    import('ezuikit-js')
      .then(({ EZUIKitPlayer }) => {
        if (disposed) return
        const target = document.getElementById(id)
        if (target) target.innerHTML = ''
        const [width, height] = size()
        player = new EZUIKitPlayer({
          id,
          url,
          accessToken,
          width,
          height,
          template: 'pcLive',
          audio: false,
          scaleMode: 1,
          language: 'zh',
          handleError: (e) => {
            if (!disposed) setStatus({ kind: 'error', message: e?.msg || '视频播放失败' })
          },
        })
        setStatus({ kind: 'ready' })
        let last = width
        ro = new ResizeObserver(() => {
          const [w, h] = size()
          if (Math.abs(w - last) < 4) return
          last = w
          try {
            player?.resize(w, h)
          } catch {
            // 旧版本 SDK 没有 resize，忽略
          }
        })
        ro.observe(box)
      })
      .catch(() => !disposed && setStatus({ kind: 'error', message: '播放器加载失败，请检查网络后重试' }))

    return () => {
      disposed = true
      ro?.disconnect()
      try {
        const r = player?.destroy?.() ?? player?.stop()
        if (r && typeof (r as Promise<unknown>).catch === 'function') (r as Promise<unknown>).catch(() => {})
      } catch {
        // 销毁失败不影响页面
      }
      player = null
    }
  }, [id, url, accessToken, attempt])

  return (
    <div ref={boxRef} className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
      <div id={id} className="absolute inset-0" />
      {status.kind === 'loading' && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
          <Spin />
          <span className="text-sm">正在加载播放器…</span>
        </div>
      )}
      {status.kind === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center text-white/80">
          <VideoCameraOutlined className="text-4xl text-white/40" />
          <span>{status.message}</span>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => setAttempt((n) => n + 1)}>
            重新连接
          </Button>
        </div>
      )}
    </div>
  )
}
