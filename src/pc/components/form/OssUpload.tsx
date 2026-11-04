import { DeleteOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Image, Upload } from 'antd'
import { useEffect, useRef, useState } from 'react'
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

export interface OssImageWallProps {
  scene: Scene
  value?: string[] | null
  onChange?: (urls: string[]) => void
  /** 最多张数 (园区图片 50) */
  max?: number
  /** 缩略图尺寸 (px) */
  size?: number
}

/** 多图上传表单控件 (FRONTEND_DESIGN §2.6 OssImageWall)：值为图片 URL 数组，可多选上传、预览、移除 */
export function OssImageWall({ scene, value, onChange, max = 50, size = 96 }: OssImageWallProps) {
  const urls = value ?? []
  const [uploading, setUploading] = useState(0)
  // 上传是异步的：用 ref 拿到最新值，避免多批上传互相覆盖
  const latest = useRef(urls)
  useEffect(() => {
    latest.current = urls
  })

  const uploadAll = async (files: File[]) => {
    const room = max - latest.current.length
    const valid = files.filter((f) => IMAGE_TYPES.includes(f.type as ContentType))
    if (valid.length < files.length) notify.error('仅支持 png / jpeg / webp 格式，已跳过其他文件')
    if (valid.length > room) notify.warning(`最多 ${max} 张，已忽略超出的 ${valid.length - room} 张`)
    const picked = valid.slice(0, Math.max(room, 0))
    if (!picked.length) return
    setUploading((n) => n + picked.length)
    const results = await Promise.allSettled(picked.map((f) => uploadToOss(scene, f)))
    setUploading((n) => n - picked.length)
    const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failed) notify.error(`${results.length - ok.length} 张上传失败：${errorText(failed.reason)}`)
    if (ok.length) onChange?.([...latest.current, ...ok])
  }

  return (
    <div>
      <Image.PreviewGroup>
        <div className="flex flex-wrap gap-2">
          {urls.map((u, i) => (
            <div
              key={u}
              style={{ width: size, height: size }}
              className="group relative overflow-hidden rounded-md border border-line border-solid bg-layout"
            >
              <Image src={u} width={size} height={size} className="object-cover" />
              <Button
                size="small"
                type="primary"
                danger
                icon={<DeleteOutlined />}
                aria-label="移除"
                className="absolute! top-1 right-1 opacity-0 group-hover:opacity-100"
                onClick={() => onChange?.(urls.filter((_, j) => j !== i))}
              />
            </div>
          ))}
          {urls.length + uploading < max && (
            <Upload
              multiple
              accept={IMAGE_TYPES.join(',')}
              showUploadList={false}
              beforeUpload={(file, list) => {
                // 多选时每个文件都会回调一次，只在第一个文件时整批处理
                if (file.uid === list[0]?.uid) uploadAll(list as File[])
                return false
              }}
            >
              <button
                type="button"
                style={{ width: size, height: size }}
                className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-line border-dashed bg-layout p-0 text-fg-tertiary text-xs hover:border-primary"
              >
                {uploading ? <LoadingOutlined /> : <PlusOutlined />}
                {uploading ? `上传中 ${uploading}` : '上传'}
              </button>
            </Upload>
          )}
        </div>
      </Image.PreviewGroup>
      <div className="mt-1 text-fg-tertiary text-xs">
        {urls.length} / {max} 张，可多选；悬停图片可移除
      </div>
    </div>
  )
}
