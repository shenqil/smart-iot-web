import { PauseOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { Select } from 'antd'
import { useEffect, useState } from 'react'
import type { AppDevice } from '@/features/device/api'
import { LiveView } from '@/features/monitor/device/VideoPanel'
import type { Rect } from './layout'
import { Panel } from './Panel'

const ROTATE_MS = 30_000

/** 右侧槽位：实时监控 (当前园区有摄像头时显示，与当前设备无关)；多个摄像头时可 30 秒轮播 */
export function CameraCard({
  cameras,
  cameraId,
  onChange,
  rect,
}: {
  cameras: AppDevice[]
  cameraId: number | null
  onChange: (id: number) => void
  rect: Rect
}) {
  const [rotate, setRotate] = useState(true)
  const camera = cameras.find((c) => c.id === cameraId) ?? cameras[0]
  const canRotate = cameras.length > 1
  // biome-ignore lint/correctness/useExhaustiveDependencies: 切换摄像头 (含手动) 后重新计时
  useEffect(() => {
    if (!rotate || !canRotate || !camera) return
    const t = window.setTimeout(() => {
      const i = cameras.findIndex((c) => c.id === camera.id)
      onChange(cameras[(i + 1) % cameras.length].id)
    }, ROTATE_MS)
    return () => clearTimeout(t)
  }, [rotate, canRotate, camera?.id])

  return (
    <Panel
      title="实时监控"
      rect={rect}
      extra={
        <>
          {canRotate && (
            <button
              type="button"
              className={`screen-btn ${rotate ? 'is-active' : 'is-quiet'}`}
              style={{ height: 26, fontSize: 12 }}
              onClick={() => setRotate((v) => !v)}
              aria-pressed={rotate}
              title={rotate ? '每 30 秒切换下一路，点击暂停' : '点击开始轮播'}
            >
              {rotate ? <PauseOutlined /> : <PlayCircleOutlined />}
              轮播
            </button>
          )}
          <Select
            size="small"
            value={camera?.id}
            onChange={onChange}
            popupMatchSelectWidth={false}
            className="w-[170px]"
            options={cameras.map((c) => ({ value: c.id, label: c.name }))}
            aria-label="切换摄像头"
          />
        </>
      }
    >
      {camera && (
        <div className="min-h-0 flex-1 overflow-hidden rounded">
          <LiveView key={camera.id} device={camera} />
        </div>
      )}
    </Panel>
  )
}
