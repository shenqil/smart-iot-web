import { App, ConfigProvider } from 'antd'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { screenTheme } from '@/app/theme'
import { useCurrentCompany } from '@/hooks/session'
import { bizNow } from '@/lib/time'

function useClock() {
  const [now, setNow] = useState(() => bizNow())
  useEffect(() => {
    const t = window.setInterval(() => setNow(bizNow()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

const PANELS = [
  ['设备概况', 'col-span-3 row-span-1'],
  ['天地图 · 设备分布', 'col-span-6 row-span-3'],
  ['实时告警', 'col-span-3 row-span-2'],
  ['未处理告警级别分布', 'col-span-3 row-span-1'],
  ['环境指标', 'col-span-3 row-span-1'],
  ['继电器操作', 'col-span-3 row-span-1'],
  ['重点设备今日曲线', 'col-span-12 row-span-1'],
] as const

/** 数据大屏 (M0：暗色框架与布局；M5 实现等比缩放与各区块数据) */
export default function ScreenPage() {
  const company = useCurrentCompany()
  const [params] = useSearchParams()
  const now = useClock()
  return (
    <ConfigProvider theme={screenTheme}>
      <App className="h-full">
        <div className="flex h-full flex-col bg-[#06121f] p-4 text-white/85">
          <header className="mb-4 grid grid-cols-3 items-center">
            <div className="text-white/70">
              {company?.name}
              {params.get('siteId') ? ` · 园区 ${params.get('siteId')}` : ' · 全部园区'}
            </div>
            <h1 className="m-0 text-center font-semibold text-2xl text-[#5eead4] tracking-widest">
              智慧物联网监测平台
            </h1>
            <div className="text-right font-mono text-white/70">{now.format('YYYY-MM-DD HH:mm:ss')}</div>
          </header>
          <main className="grid min-h-0 flex-1 grid-cols-12 grid-rows-4 gap-4">
            {PANELS.map(([title, cls]) => (
              <section
                key={title}
                className={`${cls} rounded-lg border border-[#5eead4]/20 border-solid bg-white/[0.03] p-3`}
              >
                <h2 className="m-0 font-medium text-[#5eead4] text-sm">{title}</h2>
                <p className="mt-2 text-white/40 text-xs">M5 实现</p>
              </section>
            ))}
          </main>
        </div>
      </App>
    </ConfigProvider>
  )
}
