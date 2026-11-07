import { DownOutlined, LeftOutlined, MinusOutlined, PlusOutlined, RightOutlined, UpOutlined } from '@ant-design/icons'
import { Button, Segmented } from 'antd'
import type { ReactNode } from 'react'
import { COMPANY_DENIED_CODES, errorText, isApiError } from '@/api/errors'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'
import { useCompanyId } from '@/hooks/session'
import { type Speed, usePtzControl } from '@/hooks/usePtzControl'
import { controlPTZ, PTZ } from './api'

/**
 * 云台控制面板 (PC 端)
 * - 基于共享 usePtzControl Hook 状态机
 * - 鼠标 / 触屏用 Pointer 事件并捕获指针，拖出按钮后松开也能停止；键盘 Enter / 空格按住同理
 * - 松开后锁定 1s，并在 500ms、900ms 补充调用 stop
 */
export function PtzPanel({ deviceId, ptz, zoom }: { deviceId: number; ptz: boolean; zoom: boolean }) {
  const companyId = useCompanyId()

  const handleError = (e: unknown, action: 'start' | 'stop') => {
    if (isApiError(e) && (e.status === 401 || COMPANY_DENIED_CODES.has(e.code))) {
      return handleGlobalError(e)
    }
    if (action === 'start') {
      notify.warning(errorText(e))
    }
  }

  const { active, locked, speed, setSpeed, uncertain, retryStop, bindDirection } = usePtzControl({
    companyId,
    deviceId,
    initialSpeed: 1,
    control: controlPTZ,
    onError: handleError,
  })

  const dirBtn = (dir: number, icon: ReactNode, label: string, pos: string) => {
    const isCurrentActive = active === dir
    return (
      <button
        type="button"
        aria-label={label}
        disabled={locked || uncertain !== null}
        title={locked ? '云台调整中…' : `按住${label}`}
        className={`absolute ${pos} flex size-11 select-none items-center justify-center rounded-full border border-solid text-base transition-colors ${
          locked || uncertain !== null
            ? 'cursor-not-allowed border-line bg-container/50 text-fg-tertiary opacity-50'
            : isCurrentActive
              ? 'cursor-pointer touch-none border-primary bg-primary text-white focus-visible:outline-2 focus-visible:outline-primary'
              : 'cursor-pointer touch-none border-line bg-container text-fg-secondary hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary'
        }`}
        {...bindDirection(dir)}
      >
        {icon}
      </button>
    )
  }

  const zoomBtn = (dir: number, icon: ReactNode, label: string) => {
    const isCurrentActive = active === dir
    return (
      <button
        type="button"
        aria-label={label}
        disabled={locked || uncertain !== null}
        title={locked ? '云台调整中…' : undefined}
        className={`flex h-9 flex-1 select-none items-center justify-center gap-1.5 rounded-md border border-solid text-sm transition-colors ${
          locked || uncertain !== null
            ? 'cursor-not-allowed border-line bg-container/50 text-fg-tertiary opacity-50'
            : isCurrentActive
              ? 'cursor-pointer touch-none border-primary bg-primary text-white focus-visible:outline-2 focus-visible:outline-primary'
              : 'cursor-pointer touch-none border-line bg-container text-fg hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary'
        }`}
        {...bindDirection(dir)}
      >
        {icon}
        {label}
      </button>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {ptz && (
        <div className="relative size-40 rounded-full bg-layout">
          {dirBtn(PTZ.UP, <UpOutlined />, '向上', 'top-1.5 left-1/2 -translate-x-1/2')}
          {dirBtn(PTZ.DOWN, <DownOutlined />, '向下', 'bottom-1.5 left-1/2 -translate-x-1/2')}
          {dirBtn(PTZ.LEFT, <LeftOutlined />, '向左', 'top-1/2 left-1.5 -translate-y-1/2')}
          {dirBtn(PTZ.RIGHT, <RightOutlined />, '向右', 'top-1/2 right-1.5 -translate-y-1/2')}
          <span
            className={`absolute top-1/2 left-1/2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line border-solid ${
              active != null ? 'bg-primary-bg' : 'bg-container'
            }`}
          />
        </div>
      )}
      {zoom && (
        <div className="flex w-full max-w-52 gap-2">
          {zoomBtn(PTZ.ZOOM_OUT, <MinusOutlined />, '缩小')}
          {zoomBtn(PTZ.ZOOM_IN, <PlusOutlined />, '放大')}
        </div>
      )}
      <div className="flex w-full max-w-52 items-center justify-between gap-2 text-sm">
        <span className="text-fg-secondary">速度</span>
        <Segmented<Speed>
          size="small"
          value={speed}
          onChange={setSpeed}
          disabled={active !== null || locked}
          options={[
            { value: 0, label: '慢' },
            { value: 1, label: '中' },
            { value: 2, label: '快' },
          ]}
        />
      </div>
      <p className="m-0 text-center text-fg-tertiary text-xs">
        {locked ? '云台调整中，稍候可继续控制…' : '按住方向键转动，松开停止'}
      </p>
      {uncertain !== null && (
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-danger text-xs">停止指令未确认，请重试停止</span>
          <Button size="small" danger onClick={() => void retryStop()}>
            重试停止
          </Button>
        </div>
      )}
    </div>
  )
}
