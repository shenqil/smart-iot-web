import { ArrowLeftOutlined, FlagOutlined, FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons'
import { Select } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { SiteView } from '@/features/site/api'
import { bizNow } from '@/lib/time'
import { DESIGN_W, HEADER_H } from './layout'

const WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

function Clock() {
  const [now, setNow] = useState(() => bizNow())
  useEffect(() => {
    const t = window.setInterval(() => setNow(bizNow()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="text-right leading-tight">
      <div className="text-[12px] text-[var(--sc-text-2)]">
        {now.format('YYYY-MM-DD')} {WEEK[now.day()]}
      </div>
      <div className="screen-num font-semibold text-[26px] tracking-wide">{now.format('HH:mm:ss')}</div>
    </div>
  )
}

function useFullscreen() {
  const [on, setOn] = useState(() => Boolean(document.fullscreenElement))
  useEffect(() => {
    const sync = () => setOn(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }
  return { on, toggle }
}

/** 顶栏：返回数据端 · 企业 · 园区切换 | 标题 | 日期时间 · 全屏 */
export function ScreenHeader({
  companyName,
  sites,
  siteId,
  onSiteChange,
  title,
  backTo,
}: {
  companyName: string
  sites: SiteView[]
  siteId: number | null
  onSiteChange: (id: number) => void
  title: string
  backTo: string
}) {
  const fs = useFullscreen()
  return (
    <header
      className="absolute top-0 left-0 flex items-center px-6"
      style={{ width: DESIGN_W, height: HEADER_H, boxSizing: 'border-box' }}
    >
      <div className="flex w-[620px] items-center gap-3">
        <Link to={backTo} className="screen-btn is-quiet no-underline" style={{ height: 34, fontSize: 14 }}>
          <ArrowLeftOutlined />
          返回数据端
        </Link>
        <span className="h-[26px] w-px bg-[rgb(148_163_184/0.3)]" />
        <span className="max-w-[200px] truncate text-[14px] text-[var(--sc-text-2)]" title={companyName}>
          {companyName}
        </span>
        <Select
          value={siteId ?? undefined}
          onChange={onSiteChange}
          placeholder="选择园区"
          showSearch={{ optionFilterProp: 'label' }}
          suffixIcon={null}
          prefix={<FlagOutlined className="text-[var(--sc-accent)]" />}
          className="w-[200px]"
          options={sites.map((s) => ({
            value: s.id,
            label: s.name,
            disabled: s.status === 'inactive',
          }))}
          aria-label="切换园区"
        />
      </div>
      <div className="relative flex h-full flex-1 items-center justify-center">
        <span
          className="absolute bottom-[-1px] left-1/2 h-[3px] w-[640px] -translate-x-1/2 bg-[var(--sc-accent)]"
          style={{ clipPath: 'polygon(0 0, 100% 0, 96% 100%, 4% 100%)' }}
        />
        <h1 className="m-0 truncate font-bold text-[32px] text-[#f0fdff] tracking-[6px] [text-shadow:0_0_18px_rgb(34_211_238/0.55)]">
          {title}
        </h1>
      </div>
      <div className="flex w-[620px] items-center justify-end gap-5">
        <Clock />
        <button
          type="button"
          className="screen-btn is-quiet"
          style={{ width: 36, height: 36, padding: 0, fontSize: 16 }}
          onClick={fs.toggle}
          aria-label={fs.on ? '退出全屏' : '全屏'}
          title={fs.on ? '退出全屏' : '全屏'}
        >
          {fs.on ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        </button>
      </div>
    </header>
  )
}
