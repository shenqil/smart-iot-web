import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Skeleton } from 'antd'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

export interface DetailHeaderProps {
  title?: ReactNode
  /** 标题右侧标签 */
  tags?: ReactNode
  /** 标题下方的说明 (SN、联系人等) */
  subtitle?: ReactNode
  /** 右侧操作区 */
  extra?: ReactNode
  /** 返回地址 (默认浏览器后退) */
  backTo?: string
  loading?: boolean
}

/** 详情页页头 (antd v6 没有 PageHeader) */
export function DetailHeader({ title, tags, subtitle, extra, backTo, loading }: DetailHeaderProps) {
  const navigate = useNavigate()
  return (
    <div className="mb-4 flex flex-wrap items-start gap-3 rounded-lg bg-container px-5 py-4">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        aria-label="返回"
        onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
      />
      <div className="min-w-0 flex-1">
        {loading ? (
          <Skeleton.Input active size="small" />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 font-semibold text-fg text-lg">{title}</h2>
              {tags}
            </div>
            {subtitle && <div className="mt-1 text-fg-secondary text-sm">{subtitle}</div>}
          </>
        )}
      </div>
      {extra && <div className="flex flex-wrap items-center gap-2">{extra}</div>}
    </div>
  )
}
