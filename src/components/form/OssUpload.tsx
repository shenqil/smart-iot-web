import { DeleteOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Image, Upload } from 'antd'
import { useState } from 'react'
import type { Schemas } from '@/api/client'
import { api, unwrap } from '@/api/client'
import { errorText } from '@/api/errors'
import { notify } from '@/app/notify'

type Scene = Schemas['OSSPolicyRequest']['scene']
type ContentType = Schemas['OSSPolicyRequest']['contentType']

const ICON_SCENES: Scene[] = ['device-type-icon', 'sensor-icon', 'relay-icon']
const IMAGE_TYPES: ContentType[] = ['image/png', 'image/jpeg', 'image/webp']

/** 取上传凭证后以表单直传 OSS，返回永久访问链接 (FRONTEND_DESIGN §2.6) */
export async function uploadToOss(scene: Scene, file: File): Promise<string> {
  const policy = await unwrap(
    api.POST('/api/v1/common/oss/upload-policy', {
      body: { scene, contentType: file.type as ContentType, size: file.size },
    }),
  )
  const form = new FormData()
  for (const [k, v] of Object.entries(policy.fields)) form.append(k, v)
  form.append('file', file) // 文件字段必须放最后
  const res = await fetch(policy.host, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`上传失败 (${res.status})，请检查 OSS 跨域配置`)
  return policy.url
}

export interface OssUploadProps {
  scene: Scene
  value?: string
  onChange?: (url: string) => void
  /** 预览尺寸 (px) */
  size?: number
  /** 紧凑模式 (表格内)：移除按钮只显示图标 */
  compact?: boolean
}

/** 单图上传表单控件：值为图片 URL */
export function OssUpload({ scene, value, onChange, size = 96, compact = false }: OssUploadProps) {
  const [loading, setLoading] = useState(false)
  const types = ICON_SCENES.includes(scene) ? [...IMAGE_TYPES, 'image/svg+xml'] : IMAGE_TYPES

  const upload = async (file: File) => {
    if (!types.includes(file.type as ContentType)) {
      notify.error(`仅支持 ${types.map((t) => t.replace('image/', '').replace('+xml', '')).join(' / ')} 格式`)
      return
    }
    setLoading(true)
    try {
      onChange?.(await uploadToOss(scene, file))
    } catch (e) {
      notify.error(errorText(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`flex gap-2 ${compact ? 'items-center gap-1' : 'items-end'}`}>
      <Upload
        accept={types.join(',')}
        showUploadList={false}
        beforeUpload={(file) => {
          upload(file)
          return false
        }}
      >
        <button
          type="button"
          style={{ width: size, height: size }}
          className="flex cursor-pointer items-center justify-center overflow-hidden rounded-md border border-line border-dashed bg-layout p-0 text-fg-tertiary hover:border-primary"
        >
          {loading ? (
            <LoadingOutlined />
          ) : value ? (
            <img src={value} alt="" className="size-full object-contain" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs">
              <PlusOutlined />
              上传
            </span>
          )}
        </button>
      </Upload>
      {value && !loading && (
        <>
          {!compact && <Image src={value} width={0} height={0} className="hidden" preview={{ src: value }} />}
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label="移除"
            onClick={() => onChange?.('')}
          >
            {!compact && '移除'}
          </Button>
        </>
      )}
    </div>
  )
}
