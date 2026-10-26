import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Select, Table, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useState } from 'react'
import { type RangeValue, RetentionRangePicker } from '@/components/RetentionRangePicker'
import { SlicePager } from '@/components/SlicePager'
import { sortOrderOf, toSortParam } from '@/components/table/usePageQuery'
import type { AppDevice } from '@/features/device/api'
import { channelName } from '@/features/telemetry/lib/realtime'
import { useCompanyId } from '@/hooks/session'
import { fmtDateTime } from '@/lib/time'
import { type OperationQuery, operationsQuery, type RelayOp } from './api'
import { isHoldRecord, OpStatusTag, opStatusOptions, relayStateText } from './enums'

export interface OperationTableProps {
  siteId?: number
  deviceId?: number
  variant?: 'full' | 'compact'
  pageSize?: number
  /** 设备 ID → 设备 (含继电器配置，用于显示设备名与继电器名称)；查不到时只显示 SN 与"通道 N" */
  deviceOf: (deviceId: number) => AppDevice | undefined
}

/** 继电器操作记录 (FRONTEND_DESIGN §5.5)：包含其他企业成员对同一设备的操作；不返回总数，简单分页 */
export function OperationTable({
  siteId,
  deviceId,
  variant = 'full',
  pageSize: ps = 20,
  deviceOf,
}: OperationTableProps) {
  const companyId = useCompanyId()
  const full = variant === 'full'
  const [status, setStatus] = useState<OperationQuery['status']>()
  const [range, setRange] = useState<RangeValue>()
  const [kwInput, setKwInput] = useState('')
  const [keyword, setKeyword] = useState<string>()
  const [sort, setSort] = useState('-createdAt')
  const [page, setPage] = useState({ page: 1, pageSize: ps })

  const q: OperationQuery = {
    siteId: siteId ?? undefined,
    deviceId: deviceId ?? undefined,
    status,
    start: range?.start,
    end: range?.end,
    keyword,
    sort,
    ...page,
  }
  const { data, isFetching, isPending, refetch } = useQuery(operationsQuery(companyId, q))
  const records = data?.records ?? []
  const filter =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setPage((p) => ({ ...p, page: 1 }))
    }

  const columns: ColumnsType<RelayOp> = [
    {
      title: '下发时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      sorter: true,
      sortOrder: sortOrderOf(sort, 'createdAt'),
      render: (v) => <span className="whitespace-nowrap">{fmtDateTime(v)}</span>,
    },
    ...(deviceId
      ? []
      : [
          {
            title: '设备',
            key: 'device',
            render: (_: unknown, r: RelayOp) => (
              <div>
                <div>{deviceOf(r.deviceId)?.name ?? '—'}</div>
                <div className="font-mono text-fg-tertiary text-xs">{r.deviceSn}</div>
              </div>
            ),
          },
        ]),
    {
      title: '继电器',
      key: 'relay',
      render: (_, r) => {
        const relay = deviceOf(r.deviceId)?.relays?.find((x) => x.channelNum === r.relayIndex)
        return relay ? (
          <span className="whitespace-nowrap">
            {channelName(relay)}
            <span className="ml-1 text-fg-tertiary text-xs">通道 {r.relayIndex}</span>
          </span>
        ) : (
          <span className="whitespace-nowrap">通道 {r.relayIndex}</span>
        )
      },
    },
    {
      title: '操作',
      dataIndex: 'targetState',
      width: 72,
      render: (v, r) =>
        isHoldRecord(r.status) ? (
          <Tooltip title={`当时状态：${relayStateText(v)}`}>
            <span className="text-fg-secondary">{r.status === 'hold' ? '接管' : '恢复'}</span>
          </Tooltip>
        ) : (
          <span className={v ? 'font-medium text-primary' : 'text-fg-secondary'}>{relayStateText(v)}</span>
        ),
    },
    { title: '结果', key: 'status', width: 96, render: (_, r) => <OpStatusTag op={r} /> },
    { title: '实际状态', dataIndex: 'actualState', width: 84, render: relayStateText },
    {
      title: '耗时',
      dataIndex: 'durationMs',
      width: 84,
      align: 'right',
      render: (v: number, r) => (r.finishedAt && v ? `${(v / 1000).toFixed(v < 10_000 ? 2 : 1)} s` : '—'),
    },
    {
      title: <Tooltip title="联动自动控制显示触发的告警规则">操作人 / 触发规则</Tooltip>,
      dataIndex: 'operatorName',
      width: 220,
      ellipsis: { showTitle: false },
      render: (v: string) =>
        v ? (
          <Tooltip title={v} placement="topLeft">
            {v}
          </Tooltip>
        ) : (
          '—'
        ),
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      ellipsis: true,
      render: (v) => (v ? <span className="text-danger">{v}</span> : <span className="text-fg-tertiary">—</span>),
    },
  ]

  return (
    <div className={full ? 'layout-fill' : ''}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          allowClear
          placeholder="结果"
          style={{ width: 110 }}
          value={status}
          options={opStatusOptions}
          onChange={filter(setStatus)}
        />
        {full && (
          <>
            <RetentionRangePicker value={range} onChange={filter(setRange)} />
            <Input
              allowClear
              className="w-56"
              prefix={<SearchOutlined className="text-fg-tertiary" />}
              placeholder="设备 SN / 操作人"
              value={kwInput}
              onChange={(e) => {
                setKwInput(e.target.value)
                if (!e.target.value) filter(setKeyword)(undefined)
              }}
              onPressEnter={() => filter(setKeyword)(kwInput.trim() || undefined)}
            />
          </>
        )}
        <Tooltip title="刷新">
          <Button className="ml-auto" icon={<ReloadOutlined spin={isFetching} />} onClick={() => refetch()} />
        </Tooltip>
      </div>
      <Table<RelayOp>
        rootClassName={full ? 'layout-fill' : undefined}
        size={full ? 'middle' : 'small'}
        rowKey="id"
        loading={isPending}
        columns={columns}
        dataSource={records}
        pagination={false}
        scroll={full ? { x: 'max-content', y: 400 } : { x: 'max-content' }}
        onChange={(_p, _f, sorter, extra) => {
          if (extra.action !== 'sort') return
          const s = Array.isArray(sorter) ? sorter[0] : sorter
          setSort(toSortParam(s.columnKey as string | undefined, s.order) ?? '-createdAt')
          setPage((p) => ({ ...p, page: 1 }))
        }}
        locale={{ emptyText: '暂无操作记录' }}
      />
      <SlicePager
        page={page.page}
        pageSize={page.pageSize}
        hasMore={Boolean(data?.hasMore)}
        count={records.length}
        disabled={isFetching}
        onChange={(p, size) => setPage({ page: p, pageSize: size })}
      />
    </div>
  )
}
