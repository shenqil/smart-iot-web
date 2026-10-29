import { DisconnectOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Tabs, Tag, Tooltip } from 'antd'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { useBlocker, useSearchParams } from 'react-router'
import { notify } from '@/app/notify'
import { DetailHeader } from '@/components/DetailHeader'
import { DEVICE_STATUS, EnumTag, OnlineTag } from '@/components/StatusTag'
import { useDeviceTypes } from '@/features/dict/api'
import { confirmDisconnect } from './actions'
import { type DeviceConfigApi, type DeviceDetail, deviceDetailKey, linkageKeys, schedulesKey } from './api'
import { BasicForm } from './BasicForm'
import { CameraForm } from './CameraForm'
import { LinkageEditor } from './LinkageEditor'
import { RelaysEditor } from './RelaysEditor'
import { SchedulesEditor } from './SchedulesEditor'
import { SensorsEditor } from './SensorsEditor'

export interface ExtraTab {
  key: string
  label: ReactNode
  children: ReactNode
}

/** 表单类页签：保持自然高度；其余 (表格) 页签撑满剩余高度 */
const FORM_TABS = new Set(['basic', 'camera'])

/**
 * 设备配置页 (FRONTEND_DESIGN §3.4)：基本信息 / 传感器 / 继电器 / 告警联动 / 定时开关 / 摄像头 + 端特有页签 (平台：授权企业；企业：挂载园区)
 * 保存后立即生效；有未保存修改时，切换页签或离开页面都会确认
 */
export function DeviceConfigPage({
  cfg,
  id,
  backTo,
  extraTabs = [],
  headerExtra,
  notice,
}: {
  cfg: DeviceConfigApi
  id: number
  backTo: string
  extraTabs?: ExtraTab[]
  headerExtra?: (d: DeviceDetail) => ReactNode
  /** 页头与页签之间的提示 (企业端：未挂载园区、配置共享) */
  notice?: ReactNode
}) {
  const qc = useQueryClient()
  const types = useDeviceTypes()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'basic'
  const [dirty, setDirty] = useState(false)
  const markDirty = useCallback((v: boolean) => setDirty(v), [])

  const key = deviceDetailKey(cfg, id)
  const { data: d, isPending } = useQuery({ queryKey: key, queryFn: () => cfg.detail(id) })

  const saved = (next: DeviceDetail) => {
    qc.setQueryData(key, next)
    qc.invalidateQueries({ queryKey: [...cfg.keyPrefix, 'list'] })
    setDirty(false)
  }
  const basic = useMutation({
    mutationFn: (b: Parameters<DeviceConfigApi['updateBasic']>[1]) => cfg.updateBasic(id, b),
    onSuccess: (r) => {
      saved(r)
      notify.success('基本信息已保存')
    },
  })
  const sensors = useMutation({
    mutationFn: (s: Parameters<DeviceConfigApi['updateSensors']>[1]) => cfg.updateSensors(id, s),
    onSuccess: (r) => {
      saved(r)
      qc.invalidateQueries({ queryKey: linkageKeys.all(cfg) })
      notify.success('传感器配置已保存，立即生效')
    },
  })
  const relays = useMutation({
    mutationFn: (s: Parameters<DeviceConfigApi['updateRelays']>[1]) => cfg.updateRelays(id, s),
    onSuccess: (r) => {
      saved(r)
      qc.invalidateQueries({ queryKey: linkageKeys.all(cfg) })
      qc.invalidateQueries({ queryKey: schedulesKey(cfg, id) })
      notify.success('继电器配置已保存')
    },
  })
  const camera = useMutation({
    mutationFn: (c: Parameters<DeviceConfigApi['updateCamera']>[1]) => cfg.updateCamera(id, c),
    onSuccess: (r) => {
      saved(r)
      notify.success('摄像头配置已保存')
    },
  })

  // 离开页面 (路由跳转 / 关闭标签页) 时提醒
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    notify.modal()?.confirm({
      title: '放弃未保存的修改？',
      okText: '放弃并离开',
      okButtonProps: { danger: true },
      cancelText: '继续编辑',
      onOk: () => blocker.proceed(),
      onCancel: () => blocker.reset(),
    })
  }, [blocker])
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const switchTab = (k: string) => {
    const go = () => {
      setDirty(false)
      setParams(k === 'basic' ? {} : { tab: k }, { replace: true })
    }
    if (!dirty) return go()
    notify.modal()?.confirm({
      title: '当前页签有未保存的修改，确定切换？',
      okText: '放弃修改',
      okButtonProps: { danger: true },
      onOk: go,
    })
  }

  const sensorCount = d?.sensors.length ?? 0
  const relayCount = d?.relays.length ?? 0

  return (
    <>
      <DetailHeader
        loading={isPending}
        backTo={backTo}
        title={d?.name}
        tags={
          d && (
            <>
              <OnlineTag online={d.online} />
              <EnumTag value={d.status} defs={DEVICE_STATUS} />
              <Tag>{types.nameOf(d.deviceTypeId)}</Tag>
            </>
          )
        }
        subtitle={
          d && (
            <span>
              SN <span className="font-mono">{d.deviceSn}</span> · 传感器 {sensorCount}/{d.sensorChannels} · 继电器{' '}
              {relayCount}/{d.relayChannels} · 采集间隔 {d.readInterval}s
            </span>
          )
        }
        extra={
          d && (
            <>
              <Tooltip title={d.online ? '断开后设备会自动重连' : '设备当前离线'}>
                <Button icon={<DisconnectOutlined />} onClick={() => confirmDisconnect(cfg, id)}>
                  断开连接
                </Button>
              </Tooltip>
              {headerExtra?.(d)}
            </>
          )
        }
      />
      {notice}
      {/* 表格类页签 (传感器 / 继电器 / 扩展页签) 撑满剩余高度，表格内滚动；表单页签保持自然高度 */}
      <Card variant="borderless" className={FORM_TABS.has(tab) ? undefined : 'layout-fill'}>
        {d && (
          <Tabs
            className="layout-fill"
            activeKey={tab}
            onChange={switchTab}
            destroyOnHidden
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <BasicForm device={d} saving={basic.isPending} onSave={basic.mutateAsync} onDirtyChange={markDirty} />
                ),
              },
              {
                key: 'sensors',
                label: `传感器配置 (${sensorCount})`,
                children: (
                  <SensorsEditor
                    sensors={d.sensors}
                    maxChannels={d.sensorChannels}
                    saving={sensors.isPending}
                    onSave={sensors.mutateAsync}
                    onDirtyChange={markDirty}
                  />
                ),
              },
              {
                key: 'relays',
                label: `继电器配置 (${relayCount})`,
                children: (
                  <RelaysEditor
                    relays={d.relays}
                    maxChannels={d.relayChannels}
                    saving={relays.isPending}
                    onSave={relays.mutateAsync}
                    onDirtyChange={markDirty}
                  />
                ),
              },
              {
                key: 'linkage',
                label: '告警联动',
                children: <LinkageEditor cfg={cfg} deviceId={d.id} />,
              },
              {
                key: 'schedules',
                label: '定时开关',
                children: <SchedulesEditor cfg={cfg} device={d} />,
              },
              {
                key: 'camera',
                label: '摄像头',
                children: (
                  <CameraForm
                    camera={d.camera}
                    saving={camera.isPending}
                    onSave={camera.mutateAsync}
                    onDirtyChange={markDirty}
                  />
                ),
              },
              ...extraTabs,
            ]}
          />
        )}
      </Card>
    </>
  )
}
