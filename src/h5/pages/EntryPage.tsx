import { logout } from '@shared/api/auth'
import { appDeviceSummaryQuery } from '@shared/api/device'
import { useDeviceTypes } from '@shared/api/dict'
import { resetCompanyCache } from '@shared/queryClient'
import { useQuery } from '@tanstack/react-query'
import { Button, ErrorBlock, List, NavBar, Popup } from 'antd-mobile'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useCompanyId, useCurrentCompany, useMyCompanies } from '@/hooks/session'

/** 移动端基础入口：先接通认证、企业隔离及完整统计，后续业务页在此基础上扩展。 */
export default function MobileEntryPage() {
  const id = useCompanyId()
  const company = useCurrentCompany()
  const companies = useMyCompanies()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const summary = useQuery(appDeviceSummaryQuery(id))
  const types = useDeviceTypes()
  useEffect(() => {
    resetCompanyCache('app', id)
  }, [id])
  const stats = summary.data
  return (
    <div className="mobile-page">
      <div className="mobile-topbar">
        <NavBar
          back={null}
          right={
            <Button size="small" fill="none" onClick={() => setOpen(true)}>
              切换
            </Button>
          }
        >
          {company?.name ?? '当前企业'}
        </NavBar>
      </div>
      <main className="mobile-content">
        {summary.isPending ? (
          <p role="status">加载中…</p>
        ) : summary.isError ? (
          <>
            <ErrorBlock title="统计加载失败" />
            <Button
              onClick={async () => {
                await summary.refetch()
              }}
            >
              重试
            </Button>
          </>
        ) : stats ? (
          <>
            <section className="mobile-card">
              <h3>企业概况</h3>
              <div className="mobile-stats">
                {[
                  ['园区', stats.siteCount],
                  ['设备', stats.deviceCount],
                  ['在线', stats.onlineKnown ? stats.onlineCount : '—'],
                  ['离线', stats.onlineKnown ? stats.offlineCount : '—'],
                ].map(([label, value]) => (
                  <div className="mobile-stat" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              {!stats.onlineKnown && <p role="status">在线状态暂不可用，未知 {stats.unknownCount} 台</p>}
            </section>
            <section className="mobile-card">
              <h3>设备类型分布</h3>
              <List>
                {stats.deviceTypes.map((t) => (
                  <List.Item key={t.deviceTypeId ?? 'none'} extra={`${t.count} 台`}>
                    {t.deviceTypeId == null ? '未分类' : types.nameOf(t.deviceTypeId)}
                  </List.Item>
                ))}
              </List>
            </section>
          </>
        ) : null}
        <Button block onClick={() => logout()}>
          退出登录
        </Button>
      </main>
      <Popup visible={open} onMaskClick={() => setOpen(false)} bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <List header="切换企业">
          {companies
            .filter((c) => c.accessible)
            .map((c) => (
              <List.Item
                key={c.companyId}
                onClick={() => {
                  setOpen(false)
                  navigate(`/h5/${c.companyId}/home`, { replace: true })
                }}
              >
                {c.name}
              </List.Item>
            ))}
        </List>
      </Popup>
    </div>
  )
}
