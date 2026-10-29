import { DownloadOutlined, FileExcelOutlined, SettingOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Alert, Button, Card, DatePicker, Form, Progress, Select, Tag } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'
import { OnlineTag } from '@/components/StatusTag'
import { tenantDeviceConfigApi } from '@/features/device/config/api'
import { tenantDeviceApi } from '@/features/device/tenant/api'
import { useCompanyId, useCurrentCompany, useMe } from '@/hooks/session'
import { BIZ_TZ, bizNow } from '@/lib/time'
import { exportChannels, safeFileName, TIME_HEADER } from '../lib/exportData'
import { ChannelOrderList } from './ChannelOrderList'
import {
  type ChannelSelection,
  loadSelection,
  orderedChecked,
  reconcileSelection,
  saveSelection,
} from './channelSelection'
import { type ExportProgress, runExport, saveBlob } from './runExport'
import { earliestDate, MAX_RANGE_DAYS, pickerToBiz, type Range, rangeError, rangePresets, toQuery } from './timeRange'

const MB = 1024 * 1024
const fmtMB = (n: number) => `${(n / MB).toFixed(n < 10 * MB ? 1 : 0)} MB`

function phaseText(p: ExportProgress) {
  if (p.phase === 'download') return `正在下载数据… 已接收 ${fmtMB(p.done)}`
  if (p.phase === 'parse') return '正在解析数据…'
  return `正在生成 Excel… ${p.done.toLocaleString()} / ${p.total.toLocaleString()} 行`
}

/**
 * 数据导出 (企业端)：选择设备、时间范围 (≤31 天)、已配置的传感器通道并排序，前端生成 Excel。
 * 表头为"通道名称（单位）"，第一列恒为时间 (业务时区)；无读数为空单元格
 */
export default function DataExportPage() {
  const cid = useCompanyId()
  const me = useMe()
  const company = useCurrentCompany()
  const [params, setParams] = useSearchParams()
  const deviceId = Number(params.get('deviceId')) || null
  const [keyword, setKeyword] = useState('')
  const [range, setRange] = useState<Range | null>(() => rangePresets()[0].value)
  const [selection, setSelection] = useState<ChannelSelection>({ order: [], checked: [] })
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const job = useRef<{ cancel: () => void } | null>(null)

  const devices = useQuery({
    queryKey: ['tenant', cid, 'devices', 'search', keyword],
    queryFn: () => tenantDeviceApi(cid).list({ page: 1, pageSize: 20, keyword: keyword || undefined, sort: 'name' }),
    placeholderData: keepPreviousData,
  })
  // 通道配置以设备详情为准 (与配置页共用缓存)
  const detail = useQuery({
    queryKey: ['tenant', cid, 'devices', 'detail', deviceId ?? 0],
    queryFn: () => tenantDeviceConfigApi(cid).detail(deviceId as number),
    enabled: deviceId != null,
  })
  const device = detail.data
  const sensors = device?.sensors ?? []

  // 切换设备 / 配置变化：恢复该设备上次的通道选择，并与当前配置对齐
  useEffect(() => {
    if (!device) return
    setSelection(reconcileSelection(loadSelection(cid, device.id), device.sensors))
  }, [device, cid])

  // 离开页面时取消进行中的导出
  useEffect(() => () => job.current?.cancel(), [])

  const changeSelection = (s: ChannelSelection) => {
    setSelection(s)
    if (device) saveSelection(cid, device.id, s)
  }

  const channels = exportChannels(sensors, orderedChecked(selection))
  const rangeErr = rangeError(range)
  const running = progress !== null
  const canExport = device && channels.length > 0 && !rangeErr && !running

  const start = async () => {
    if (!device || !range || !canExport) return
    const q = toQuery(range)
    const [a, b] = range.map(pickerToBiz)
    const fmt = 'YYYY-MM-DD HH:mm:ss'
    setProgress({ phase: 'download', done: 0, total: 0 })
    const task = runExport({
      companyId: cid,
      deviceId: device.id,
      ...q,
      channels,
      info: [
        ['企业', company?.name ?? ''],
        ['设备', device.name],
        ['设备 SN', device.deviceSn],
        ['开始时间', a.format(fmt)],
        ['结束时间', b.format(fmt)],
        ['时区', BIZ_TZ],
        ['导出通道', channels.map((c) => c.header).join('、')],
        ['导出时间', bizNow().format(fmt)],
        ['导出人', me.nickname || me.username],
        ['说明', '数值已按通道配置换算与校准；空单元格表示该时刻无读数'],
      ],
      onProgress: setProgress,
    })
    job.current = task
    try {
      const r = await task.done
      if (!r) {
        notify.info('所选时间范围内没有数据')
        return
      }
      const name = safeFileName(
        `${device.name}_${device.deviceSn}_${a.format('YYYYMMDDHHmm')}-${b.format('YYYYMMDDHHmm')}`,
      )
      saveBlob(r.blob, `${name}.xlsx`)
      notify.success(`已导出 ${r.rows.toLocaleString()} 行数据`)
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) handleGlobalError(e)
    } finally {
      job.current = null
      setProgress(null)
    }
  }

  const cancel = () => {
    job.current?.cancel()
    notify.info('已取消导出')
  }

  // 已选设备不在搜索结果中时补进选项，保证显示名称
  const options = (devices.data?.records ?? []).map((d) => ({ value: d.id, d }))
  if (device && !options.some((o) => o.value === device.id)) options.unshift({ value: device.id, d: device })

  const percent =
    progress?.phase === 'write' && progress.total ? Math.round((progress.done / progress.total) * 100) : undefined

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card variant="borderless" title="数据导出">
        <Form layout="vertical" disabled={running}>
          <Form.Item label="设备" required>
            <Select
              showSearch
              allowClear
              value={deviceId ?? undefined}
              placeholder="搜索 SN / 名称"
              filterOption={false}
              onSearch={setKeyword}
              loading={devices.isFetching}
              onChange={(id?: number) => setParams(id ? { deviceId: String(id) } : {}, { replace: true })}
              options={options.map(({ value, d }) => ({
                value,
                label: (
                  <span className="flex items-center gap-2">
                    <span className="truncate">{d.name}</span>
                    <span className="font-mono text-fg-tertiary text-xs">{d.deviceSn}</span>
                    <OnlineTag online={d.online} />
                  </span>
                ),
              }))}
            />
          </Form.Item>
          <Form.Item
            label="时间范围"
            required
            validateStatus={rangeErr && range ? 'error' : undefined}
            help={rangeErr && range ? rangeErr : `最多 ${MAX_RANGE_DAYS} 天；明细数据只保留当月与上月 (${BIZ_TZ})`}
          >
            <DatePicker.RangePicker
              showTime={{ format: 'HH:mm:ss' }}
              format="YYYY-MM-DD HH:mm:ss"
              className="w-full max-w-[460px]"
              value={range}
              presets={rangePresets()}
              onChange={(v) => setRange(v?.[0] && v[1] ? [v[0], v[1]] : null)}
              disabledDate={(current, info) => {
                const day = pickerToBiz(current)
                if (day.isBefore(earliestDate(), 'day') || day.isAfter(bizNow(), 'day')) return true
                const from = info?.from
                return Boolean(from && Math.abs(current.diff(from, 'day')) > MAX_RANGE_DAYS)
              }}
            />
          </Form.Item>
          <Form.Item label="导出通道" required>
            {deviceId == null ? (
              <div className="text-fg-tertiary">请先选择设备</div>
            ) : detail.isPending ? (
              <div className="text-fg-tertiary">加载通道配置…</div>
            ) : (
              <>
                <ChannelOrderList sensors={sensors} value={selection} onChange={changeSelection} />
                {!sensors.length && (
                  <Link to={`/tenant/${cid}/devices/${deviceId}?tab=sensors`}>
                    <Button className="mt-2" icon={<SettingOutlined />}>
                      去配置传感器
                    </Button>
                  </Link>
                )}
              </>
            )}
          </Form.Item>
        </Form>
      </Card>

      <div className="space-y-4">
        <Card variant="borderless" title="表头预览">
          <div className="flex flex-wrap gap-1.5">
            <Tag color="processing">{TIME_HEADER}</Tag>
            {channels.map((c) => (
              <Tag key={c.channel}>{c.header}</Tag>
            ))}
            {!channels.length && <span className="text-fg-tertiary text-sm">未选择通道</span>}
          </div>
          <div className="mt-3 text-fg-tertiary text-xs">
            第一列为时间 ({BIZ_TZ})，其余列按所选顺序；数值保留到通道分辨率对应的小数位，无读数为空。超过 Excel 单表
            1,048,575 行时自动拆分为多个工作表。
          </div>
        </Card>
        <Card variant="borderless">
          {device?.status === 'fault' && (
            <Alert className="mb-3" type="warning" showIcon title="该设备已被标记为损坏，可能缺少近期数据" />
          )}
          {progress ? (
            <div className="space-y-3">
              <div className="text-sm">{phaseText(progress)}</div>
              <Progress percent={percent ?? 0} status="active" showInfo={percent !== undefined} />
              <Button danger block onClick={cancel}>
                取消导出
              </Button>
            </div>
          ) : (
            <Button
              type="primary"
              size="large"
              block
              icon={<FileExcelOutlined />}
              disabled={!canExport}
              onClick={start}
            >
              导出 Excel
            </Button>
          )}
          {!running && (
            <div className="mt-3 text-fg-tertiary text-xs">
              <DownloadOutlined /> 数据量大时下载可能需要几分钟 (后端最长 5 分钟)，过程中可取消；每人同时最多 2
              个历史查询。
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
