import {
  BorderOuterOutlined,
  DeleteOutlined,
  DisconnectOutlined,
  EditOutlined,
  LinkOutlined,
  ProfileOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Descriptions, Empty, Image, Result, Tabs } from 'antd'
import type { Key } from 'react'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { isApiError } from '@/api/errors'
import { notify } from '@/app/notify'
import { SiteMap } from '@/components/map/SiteMap'
import { DEVICE_STATUS, EnumTag, enumOptions, OnlineTag, SITE_STATUS } from '@/components/StatusTag'
import { type PageColumn, PageTable } from '@/components/table/PageTable'
import { RelationModal } from '@/components/table/RelationModal'
import { deviceColumns } from '@/features/device/columns'
import { useDeviceTypes } from '@/features/dict/api'
import { useCompanyId } from '@/hooks/session'
import { joinAddress } from '@/lib/address'
import { affectedText, confirmAction } from '@/lib/confirm'
import { invalidateTenant } from '@/lib/tenant'
import { fmtDateTime } from '@/lib/time'
import { type SiteDevice, tenantSiteApi, tenantSiteDetailQuery, tenantSiteKeys } from './api'
import { type FenceChrome, GeofencePanel } from './geofence/GeofencePanel'
import { parseGeofences } from './geofence/model'
import { SiteCover } from './SiteCover'
import { SiteFormDrawer } from './SiteFormDrawer'
import { SITE_DELETE_TIP } from './SiteListPage'

/** 园区详情：园区详情与电子围栏两个页签，内容占满剩余高度 */
export default function SiteDetailPage() {
  const cid = useCompanyId()
  const id = Number(useParams().id)
  const api = tenantSiteApi(cid)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const types = useDeviceTypes()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'fence' ? 'fence' : 'detail'
  const [editing, setEditing] = useState(false)
  const [mounting, setMounting] = useState(false)
  const [chrome, setChrome] = useState<FenceChrome | null>(null)
  const { data: s, isPending, error } = useQuery({ ...tenantSiteDetailQuery(cid, id), meta: { silent: true } })
  const devicePath = `/tenant/${cid}/devices`

  // 挂载关系影响园区设备数、设备的挂载园区与企业概览
  const refresh = () => invalidateTenant(qc, cid, 'sites', 'devices', 'company')

  if (error) {
    return (
      <Card variant="borderless">
        <Result
          status={isApiError(error) && error.status === 404 ? '404' : 'error'}
          title={isApiError(error) && error.status === 404 ? '数据不存在或无权访问' : error.message}
          extra={<Button onClick={() => navigate(`/tenant/${cid}/sites`)}>返回园区列表</Button>}
        />
      </Card>
    )
  }

  const remove = () =>
    confirmAction({
      title: `删除园区「${s?.name}」？`,
      content: SITE_DELETE_TIP,
      okText: '删除',
      onOk: () => api.remove([id]),
      successText: '园区已删除',
      onDone: () => {
        navigate(`/tenant/${cid}/sites`, { replace: true })
        // 先移除该园区自身的缓存，避免仍挂载的页面重新请求得到 404
        qc.removeQueries({ queryKey: tenantSiteKeys.detail(cid, id) })
        qc.removeQueries({ queryKey: tenantSiteKeys.devices(cid, id) })
        qc.invalidateQueries({ queryKey: tenantSiteKeys.list(cid) })
        qc.invalidateQueries({ queryKey: tenantSiteKeys.options(cid) })
        invalidateTenant(qc, cid, 'devices', 'company')
      },
    })

  const unmount = (ids: Key[], clear?: () => void) =>
    confirmAction({
      title: `从本园区解除 ${ids.length} 台设备？`,
      content: '设备仍属于本企业；不再挂载任何园区的设备在数据使用端不可见。',
      okText: '解除挂载',
      onOk: () => api.unmount(id, ids as number[]),
      successText: affectedText('解除'),
      onDone: () => {
        clear?.()
        refresh()
      },
    })

  const switchTab = (key: string) => {
    const go = () => setParams(key === 'detail' ? {} : { tab: key }, { replace: true })
    if (tab === 'fence' && key !== 'fence' && chrome?.saving) return
    if (tab === 'fence' && key !== 'fence' && chrome?.dirty) {
      notify.modal()?.confirm({
        title: '放弃未保存的修改？',
        okText: '放弃',
        okButtonProps: { danger: true },
        cancelText: '继续编辑',
        onOk: go,
      })
      return
    }
    go()
  }

  const areaCount = chrome?.savedCount ?? (s ? parseGeofences(s.properties).length : 0)
  const detailActions = (
    <div className="flex gap-2">
      <Button icon={<EditOutlined />} onClick={() => setEditing(true)} disabled={!s}>
        编辑
      </Button>
      <Button danger icon={<DeleteOutlined />} onClick={remove} disabled={!s}>
        删除
      </Button>
    </div>
  )
  const fenceActions = (
    <Button
      type="primary"
      icon={<SaveOutlined />}
      disabled={!chrome?.canSave}
      loading={chrome?.saving}
      onClick={() => chrome?.save()}
    >
      {chrome?.saveLabel ?? '保存围栏'}
    </Button>
  )

  const columns: PageColumn<SiteDevice>[] = [
    ...deviceColumns(types.nameOf, devicePath).filter((c) => c.title !== '创建时间'),
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      render: (_, r) => (
        <Button type="link" size="small" danger onClick={() => unmount([r.id])}>
          解除挂载
        </Button>
      ),
    },
  ]

  return (
    <>
      <Card variant="borderless" className="layout-fill overflow-hidden">
        <Tabs
          className="layout-fill"
          activeKey={tab}
          onChange={switchTab}
          destroyOnHidden
          tabBarExtraContent={{ right: tab === 'fence' ? fenceActions : detailActions }}
          items={[
            {
              key: 'detail',
              icon: <ProfileOutlined />,
              label: '园区详情',
              children: (
                <div className="layout-fill min-h-0">
                  <div className="grid h-full min-h-0 grid-cols-[360px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-4">
                    <Card
                      variant="borderless"
                      loading={isPending}
                      className="h-full min-h-0 overflow-y-auto"
                      styles={{ body: { padding: 0 } }}
                    >
                      {s && (
                        <>
                          <SiteCover src={s.coverImage} height={160} />
                          <div className="space-y-4 p-4">
                            <Descriptions column={1} size="small">
                              <Descriptions.Item label="状态">
                                <EnumTag value={s.status} defs={SITE_STATUS} />
                              </Descriptions.Item>
                              <Descriptions.Item label="挂载设备">{s.deviceCount} 台</Descriptions.Item>
                              <Descriptions.Item label="地址">{joinAddress(s) || '—'}</Descriptions.Item>
                              <Descriptions.Item label="坐标">
                                {s.longitude != null ? (
                                  <span className="font-mono text-xs">
                                    {s.longitude.toFixed(6)}, {s.latitude?.toFixed(6)}
                                  </span>
                                ) : (
                                  <span className="text-fg-tertiary">未定位</span>
                                )}
                              </Descriptions.Item>
                              <Descriptions.Item label="创建时间">{fmtDateTime(s.createdAt)}</Descriptions.Item>
                              <Descriptions.Item label="更新时间">{fmtDateTime(s.updatedAt)}</Descriptions.Item>
                              <Descriptions.Item label="描述">
                                <span className="whitespace-pre-wrap">{s.description || '—'}</span>
                              </Descriptions.Item>
                            </Descriptions>
                            {s.longitude != null && <SiteMap height={200} sites={[s]} />}
                            <div>
                              <div className="mb-2 font-medium">园区图片 ({s.images?.length ?? 0})</div>
                              {s.images?.length ? (
                                <Image.PreviewGroup>
                                  <div className="grid grid-cols-3 gap-2">
                                    {s.images.map((u) => (
                                      <Image
                                        key={u}
                                        src={u}
                                        height={80}
                                        width="100%"
                                        className="rounded object-cover"
                                      />
                                    ))}
                                  </div>
                                </Image.PreviewGroup>
                              ) : (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无图片" />
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </Card>
                    <Card
                      variant="borderless"
                      className="layout-fill h-full min-h-0"
                      title={`园区设备${s ? ` (${s.deviceCount})` : ''}`}
                    >
                      <PageTable<SiteDevice>
                        bare
                        prefix="d_"
                        queryKey={tenantSiteKeys.devices(cid, id)}
                        fetcher={(q) => api.devices(id, q)}
                        columns={columns}
                        rowKey="id"
                        keywordPlaceholder="SN / 名称 / SIM / MAC"
                        defaultSort="name"
                        filters={[
                          {
                            name: 'deviceTypeId',
                            type: 'number',
                            placeholder: '设备类型',
                            options: types.options,
                            width: 140,
                          },
                          { name: 'status', placeholder: '状态', options: enumOptions(DEVICE_STATUS), width: 100 },
                        ]}
                        toolbar={
                          <Button type="primary" icon={<LinkOutlined />} onClick={() => setMounting(true)}>
                            挂载设备
                          </Button>
                        }
                        batchActions={(keys, _r, clear) => (
                          <Button
                            danger
                            size="small"
                            icon={<DisconnectOutlined />}
                            onClick={() => unmount(keys, clear)}
                          >
                            批量解除
                          </Button>
                        )}
                      />
                    </Card>
                  </div>
                </div>
              ),
            },
            {
              key: 'fence',
              icon: <BorderOuterOutlined />,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  电子围栏{areaCount ? ` (${areaCount})` : ''}
                  {tab === 'fence' && chrome?.dirty ? (
                    <span className="inline-block size-1.5 rounded-full bg-primary" title="未保存" />
                  ) : null}
                </span>
              ),
              children: s ? <GeofencePanel key={s.id} site={s} onChrome={setChrome} /> : null,
            },
          ]}
        />
      </Card>
      <SiteFormDrawer open={editing} site={s} onClose={() => setEditing(false)} />
      <RelationModal<SiteDevice>
        open={mounting}
        title={`挂载设备到「${s?.name ?? ''}」`}
        queryKey={tenantSiteKeys.devices(cid, id)}
        fetchAvailable={(q) => api.availableDevices(id, q)}
        rowKey={(r) => r.id}
        keywordPlaceholder="搜索 SN / 名称 / SIM / MAC"
        label={(r) => (
          <span>
            <span className="font-mono">{r.deviceSn}</span>
            <span className="text-fg-tertiary"> · {r.name}</span>
          </span>
        )}
        columns={[
          { title: 'SN', dataIndex: 'deviceSn', render: (v) => <span className="font-mono">{v}</span> },
          { title: '名称', dataIndex: 'name' },
          { title: '类型', dataIndex: 'deviceTypeId', render: (v) => types.nameOf(v) },
          {
            title: '在线',
            dataIndex: 'online',
            render: (v) => <OnlineTag online={v} />,
          },
        ]}
        okText="挂载"
        onConfirm={async (items) => {
          const r = await api.mount(
            id,
            items.map((i) => i.key as number),
          )
          notify.success(affectedText('挂载')(r))
          refresh()
        }}
        onClose={() => setMounting(false)}
      />
    </>
  )
}
