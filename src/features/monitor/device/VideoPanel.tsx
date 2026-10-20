import { VideoCameraOutlined } from '@ant-design/icons'
import { Card } from 'antd'

/**
 * 视频监控设备：只展示视频。数据端暂时拿不到播放地址 (FRONTEND_DESIGN §9 #3)，先留出播放区域
 */
export function VideoPanel() {
  return (
    <Card variant="borderless" title="实时画面">
      <div className="mx-auto flex aspect-video w-full max-w-[calc(70vh*16/9)] flex-col items-center justify-center gap-3 rounded-md bg-[#1b2430] text-white/70">
        <VideoCameraOutlined className="text-5xl text-white/40" />
        <div className="text-base text-white/80">视频播放暂未开放</div>
        <div className="text-sm">后续版本可在这里直接查看监控画面</div>
      </div>
    </Card>
  )
}
