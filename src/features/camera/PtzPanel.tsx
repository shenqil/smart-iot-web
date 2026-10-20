import { DownOutlined, LeftOutlined, MinusOutlined, PlusOutlined, RightOutlined, UpOutlined } from '@ant-design/icons'
import { Segmented } from 'antd'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { COMPANY_DENIED_CODES, errorText, isApiError } from '@/api/errors'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'
import { useCompanyId } from '@/hooks/session'
import { controlPTZ, PTZ } from './api'

type Speed = 0 | 1 | 2

/**
 * 云台控制 (按住转动、松开停止)
 * - 鼠标 / 触屏用 Pointer 事件并捕获指针，拖出按钮后松开也能停止；键盘 Enter / 空格按住同理
 * - 每个 start 都发送对应的 stop；页面失去焦点或卸载时停止正在进行的转动
 */
export function PtzPanel({ deviceId, ptz, zoom }: { deviceId: number; ptz: boolean; zoom: boolean }) {
  const companyId = useCompanyId()
  const [active, setActive] = useState<number | null>(null)
  const [speed, setSpeed] = useState<Speed>(1)
  const activeRef = useRef<number | null>(null)

  const send = async (action: 'start' | 'stop', direction: number) => {
    try {
      const { error } = await controlPTZ(companyId, deviceId, { action, direction, speed })
      if (error) throw error
    } catch (e) {
      if (isApiError(e) && (e.status === 401 || COMPANY_DENIED_CODES.has(e.code))) return handleGlobalError(e)
      if (action === 'start') notify.warning(errorText(e))
    }
  }
  const start = (dir: number) => {
    if (activeRef.current != null) return
    activeRef.current = dir
    setActive(dir)
    send('start', dir)
  }
  const stop = () => {
    const dir = activeRef.current
    if (dir == null) return
    activeRef.current = null
    setActive(null)
    send('stop', dir)
  }

  // 页面失去焦点 / 切走 / 卸载时停止转动
  // biome-ignore lint/correctness/useExhaustiveDependencies: stop 只读 ref
  useEffect(() => {
    const onBlur = () => stop()
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onBlur)
    return () => {
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onBlur)
      stop()
    }
  }, [])

  const hold = (dir: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return
      e.currentTarget.setPointerCapture?.(e.pointerId)
      start(dir)
    },
    onPointerUp: stop,
    onPointerCancel: stop,
    onLostPointerCapture: stop,
    onKeyDown: (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
        e.preventDefault()
        start(dir)
      }
    },
    onKeyUp: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') stop()
    },
    onBlur: stop,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  })

  const dirBtn = (dir: number, icon: ReactNode, label: string, pos: string) => (
    <button
      type="button"
      aria-label={label}
      title={`按住${label}`}
      className={`absolute ${pos} flex size-12 cursor-pointer touch-none select-none items-center justify-center rounded-full border border-solid text-base transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
        active === dir
          ? 'border-primary bg-primary text-white'
          : 'border-line bg-container text-fg-secondary hover:border-primary hover:text-primary'
      }`}
      {...hold(dir)}
    >
      {icon}
    </button>
  )

  const zoomBtn = (dir: number, icon: ReactNode, label: string) => (
    <button
      type="button"
      aria-label={label}
      className={`flex h-10 flex-1 cursor-pointer touch-none select-none items-center justify-center gap-1.5 rounded-md border border-solid text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
        active === dir
          ? 'border-primary bg-primary text-white'
          : 'border-line bg-container text-fg hover:border-primary hover:text-primary'
      }`}
      {...hold(dir)}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div className="flex flex-col items-center gap-5">
      {ptz && (
        <div className="relative size-44 rounded-full bg-layout">
          {dirBtn(PTZ.UP, <UpOutlined />, '向上', 'top-2 left-1/2 -translate-x-1/2')}
          {dirBtn(PTZ.DOWN, <DownOutlined />, '向下', 'bottom-2 left-1/2 -translate-x-1/2')}
          {dirBtn(PTZ.LEFT, <LeftOutlined />, '向左', 'top-1/2 left-2 -translate-y-1/2')}
          {dirBtn(PTZ.RIGHT, <RightOutlined />, '向右', 'top-1/2 right-2 -translate-y-1/2')}
          <span
            className={`absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line border-solid ${
              active != null ? 'bg-primary-bg' : 'bg-container'
            }`}
          />
        </div>
      )}
      {zoom && (
        <div className="flex w-full max-w-56 gap-2">
          {zoomBtn(PTZ.ZOOM_OUT, <MinusOutlined />, '缩小')}
          {zoomBtn(PTZ.ZOOM_IN, <PlusOutlined />, '放大')}
        </div>
      )}
      <div className="flex w-full max-w-56 items-center justify-between gap-2 text-sm">
        <span className="text-fg-secondary">速度</span>
        <Segmented<Speed>
          size="small"
          value={speed}
          onChange={setSpeed}
          options={[
            { value: 0, label: '慢' },
            { value: 1, label: '中' },
            { value: 2, label: '快' },
          ]}
        />
      </div>
      <p className="m-0 text-center text-fg-tertiary text-xs">按住方向键转动，松开停止</p>
    </div>
  )
}
