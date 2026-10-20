import { CheckOutlined, InfoCircleOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Input, Modal, Segmented, Select, Table, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useState } from 'react'
import { notify } from '@/app/notify'
import { handleGlobalError } from '@/app/queryClient'
import { type RangeValue, RetentionRangePicker } from '@/components/RetentionRangePicker'
import { SlicePager } from '@/components/SlicePager'
import { sortOrderOf, toSortParam } from '@/components/table/usePageQuery'
import { useCompanyId } from '@/hooks/session'
import { fmtDateTime } from '@/lib/time'
import { type AlarmQuery, type AlarmView, alarmsQuery, processAlarms } from './api'
import { ALARM_TYPE, AlarmLevelTag, alarmLevelOptions, alarmTypeOptions, thresholdText } from './enums'

type Processed = 'all' | 'false' | 'true'

export interface AlarmTableProps {
  /** 范围：取自设备树 (园区 / 设备) */
  siteId?: number
  deviceId?: number
  /** full：告警页 (全部筛选项、表格撑满)；compact：设备工作区内嵌 */
  variant?: 'full' | 'compact'
  defaultProcessed?: Processed
  pageSize?: number
}

const extraOf = (a: AlarmView) => (a.extra ?? {}) as { unit?: string; display_name?: string }

/** 告警列表 + 批量处理 (FRONTEND_DESIGN §5.4)：不返回总数，简单分页 */
export function AlarmTable({
  siteId,
  deviceId,
  variant = 'full',
  defaultProcessed = 'all',
  pageSize: ps = 20,
}: AlarmTableProps) {
  const companyId = useCompanyId()
  const qc = useQueryClient()
  const full = variant === 'full'
  const [processed, setProcessed] = useState<Processed>(defaultProcessed)
  const [level, setLevel] = useState<number>()
  const [type, setType] = useState<AlarmQuery['type']>()
  const [range, setRange] = useState<RangeValue>()
  const [kwInput, setKwInput] = useState('')
  const [keyword, setKeyword] = useState<string>()
  const [sort, setSort] = useState('-lastAlarmAt')
  const [page, setPage] = useState({ page: 1, pageSize: ps })
  const [selected, setSelected] = useState<number[]>([])
  const [processing, setProcessing] = useState<number[] | null>(null)

  const q: AlarmQuery = {
    siteId: siteId ?? undefined,
    deviceId: deviceId ?? undefined,
    level,
    type,
    processed: processed === 'all' ? undefined : processed,
    start: range?.start,
    end: range?.end,
    keyword,
    sort,
    ...page,
  }
  const { data, isFetching, isPending, refetch } = useQuery(alarmsQuery(companyId, q))
  const records = data?.records ?? []

  /** 修改筛选回到第 1 页 */
  const filter =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setPage((p) => ({ ...p, page: 1 }))
      setSelected([])
    }

  const columns: ColumnsType<AlarmView> = [
    {
      title: '级别',
      dataIndex: 'alarmLevel',
      key: 'alarmLevel',
      width: 84,
      sorter: true,
      sortOrder: sortOrderOf(sort, 'alarmLevel'),
      render: (v) => <AlarmLevelTag level={v} />,
    },
    {
      title: '告警',
      key: 'desc',
      render: (_, a) => {
        const t = ALARM_TYPE[a.alarmType]
        const ch = extraOf(a).display_name
        return (
          <div className="min-w-48">
            <div className="flex items-center gap-1.5">
              <Tag color={t?.color} className="m-0" variant="filled">
                {t?.label ?? a.alarmType}
              </Tag>
              <span className="font-medium">{a.description || (ch ? `${ch}告警` : '—')}</span>
            </div>
            {ch && <div className="mt-0.5 text-fg-tertiary text-xs">通道：{ch}</div>}
          </div>
        )
      },
    },
    ...(deviceId
      ? []
      : [
          {
            title: '设备',
            key: 'device',
            render: (_: unknown, a: AlarmView) => (
              <div>
                <div>{a.deviceName || '—'}</div>
                <div className="font-mono text-fg-tertiary text-xs">{a.deviceSn}</div>
              </div>
            ),
          },
        ]),
    {
      title: '实际值 / 阈值',
      key: 'value',
      render: (_, a) => {
        if (a.alarmType !== 'threshold_breach') return <span className="text-fg-tertiary">—</span>
        const unit = extraOf(a).unit ?? ''
        return (
          <span className="whitespace-nowrap">
            <b className="text-danger">
              {a.value}
              {unit && ` ${unit}`}
            </b>
            <span className="mx-1 text-fg-tertiary">/</span>
            <span className="text-fg-secondary">{thresholdText(a.alarmSubType, a.threshold, unit)}</span>
          </span>
        )
      },
    },
    {
      title: (
        <Tooltip title="同一告警 3 分钟内合并计次，次数约 3~4 分钟后更新">
          次数 <InfoCircleOutlined className="text-fg-tertiary" />
        </Tooltip>
      ),
      dataIndex: 'alarmCount',
      key: 'alarmCount',
      width: 90,
      align: 'right',
      sorter: true,
      sortOrder: sortOrderOf(sort, 'alarmCount'),
    },
    {
      title: '最后告警',
      dataIndex: 'lastAlarmAt',
      key: 'lastAlarmAt',
      width: 150,
      sorter: true,
      sortOrder: sortOrderOf(sort, 'lastAlarmAt'),
      render: (v, a) => (
        <Tooltip title={`首次告警 ${fmtDateTime(a.createdAt)}`}>
          <span className="whitespace-nowrap">{fmtDateTime(v)}</span>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'processed',
      width: 90,
      render: (v, a) =>
        v ? (
          <Tooltip
            title={
              <div>
                <div>处理人：{a.processorName || '—'}</div>
                <div>时间：{fmtDateTime(a.processedAt)}</div>
                {a.processRemark && <div>备注：{a.processRemark}</div>}
              </div>
            }
          >
            <Tag color="default" icon={<CheckOutlined />} className="m-0">
              已处理
            </Tag>
          </Tooltip>
        ) : (
          <Tag color="error" className="m-0">
            未处理
          </Tag>
        ),
    },
    {
      title: '操作',
      key: 'op',
      width: 72,
      fixed: 'right',
      render: (_, a) =>
        a.processed ? null : (
          <Button type="link" size="small" className="px-0" onClick={() => setProcessing([a.id])}>
            处理
          </Button>
        ),
    },
  ]

  return (
    <div className={full ? 'layout-fill' : ''}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented<Processed>
          value={processed}
          onChange={filter(setProcessed)}
          options={[
            { value: 'false', label: '未处理' },
            { value: 'true', label: '已处理' },
            { value: 'all', label: '全部' },
          ]}
        />
        <Select
          allowClear
          placeholder="级别"
          style={{ width: 100 }}
          value={level}
          options={alarmLevelOptions}
          onChange={filter(setLevel)}
        />
        {full && (
          <>
            <Select
              allowClear
              placeholder="类型"
              style={{ width: 100 }}
              value={type}
              options={alarmTypeOptions}
              onChange={filter(setType)}
            />
            <RetentionRangePicker value={range} onChange={filter(setRange)} />
            <Input
              allowClear
              className="w-56"
              prefix={<SearchOutlined className="text-fg-tertiary" />}
              placeholder="设备 SN / 名称、描述"
              value={kwInput}
              onChange={(e) => {
                setKwInput(e.target.value)
                if (!e.target.value) filter(setKeyword)(undefined)
              }}
              onPressEnter={() => filter(setKeyword)(kwInput.trim() || undefined)}
            />
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {selected.length > 0 && (
            <Button type="primary" icon={<CheckOutlined />} onClick={() => setProcessing(selected)}>
              处理所选 ({selected.length})
            </Button>
          )}
          <Tooltip title="刷新">
            <Button icon={<ReloadOutlined spin={isFetching} />} onClick={() => refetch()} />
          </Tooltip>
        </div>
      </div>
      <Table<AlarmView>
        rootClassName={full ? 'layout-fill' : undefined}
        size={full ? 'middle' : 'small'}
        rowKey="id"
        loading={isPending}
        columns={columns}
        dataSource={records}
        pagination={false}
        scroll={full ? { x: 'max-content', y: 400 } : { x: 'max-content' }}
        rowSelection={{
          selectedRowKeys: selected,
          preserveSelectedRowKeys: true,
          onChange: (keys) => setSelected(keys as number[]),
          getCheckboxProps: (a) => ({ disabled: a.processed }),
        }}
        onChange={(_p, _f, sorter, extra) => {
          if (extra.action !== 'sort') return
          const s = Array.isArray(sorter) ? sorter[0] : sorter
          setSort(toSortParam(s.columnKey as string | undefined, s.order) ?? '-lastAlarmAt')
          setPage((p) => ({ ...p, page: 1 }))
        }}
        locale={{ emptyText: processed === 'false' ? '没有未处理的告警' : '暂无告警' }}
      />
      <SlicePager
        page={page.page}
        pageSize={page.pageSize}
        hasMore={Boolean(data?.hasMore)}
        count={records.length}
        disabled={isFetching}
        onChange={(p, size) => setPage({ page: p, pageSize: size })}
      />
      <ProcessModal
        ids={processing}
        onClose={() => setProcessing(null)}
        onSubmit={async (ids, remark) => {
          const r = await processAlarms(companyId, ids, remark)
          notify.success(`已处理 ${r.affected} 条告警`)
          setSelected((s) => s.filter((id) => !ids.includes(id)))
          await qc.invalidateQueries({ queryKey: ['app', companyId, 'alarms'] })
        }}
      />
    </div>
  )
}

function ProcessModal({
  ids,
  onClose,
  onSubmit,
}: {
  ids: number[] | null
  onClose: () => void
  onSubmit: (ids: number[], remark: string) => Promise<void>
}) {
  const [remark, setRemark] = useState('')
  const [loading, setLoading] = useState(false)
  return (
    <Modal
      open={ids != null}
      title={ids && ids.length > 1 ? `处理 ${ids.length} 条告警` : '处理告警'}
      okText="确认处理"
      confirmLoading={loading}
      destroyOnHidden
      afterClose={() => setRemark('')}
      onCancel={onClose}
      onOk={async () => {
        if (!ids) return
        setLoading(true)
        try {
          await onSubmit(ids, remark.trim())
          onClose()
        } catch (e) {
          handleGlobalError(e)
        } finally {
          setLoading(false)
        }
      }}
    >
      <Input.TextArea
        autoFocus
        rows={3}
        maxLength={500}
        showCount
        placeholder="处理备注 (选填)，如：已现场检查，通风后恢复"
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
      />
    </Modal>
  )
}
