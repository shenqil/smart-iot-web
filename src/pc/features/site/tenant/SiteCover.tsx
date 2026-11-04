import { EnvironmentOutlined } from '@ant-design/icons'

/** 园区封面：未上传时显示占位 */
export function SiteCover({ src, height = 144 }: { src?: string | null; height?: number }) {
  return src ? (
    <img src={src} alt="" style={{ height }} className="block w-full object-cover" />
  ) : (
    <div style={{ height }} className="flex w-full items-center justify-center bg-layout text-3xl text-fg-tertiary">
      <EnvironmentOutlined />
    </div>
  )
}
