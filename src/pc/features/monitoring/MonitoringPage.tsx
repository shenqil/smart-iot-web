import { Alert, Button, Card, Drawer, Segmented, Select, Skeleton, Statistic, Table, Tabs, Tag } from 'antd'
import { useState } from 'react'
import { useMonitoring } from './api'
import { memoryPercent, nodeLabel, ResourcePanel } from './ResourcePanel'
import { format, type Sample, Trend, type Window } from './Trend'

const latency = [
  ['HTTP API', 'http'],
  ['NATS 请求方往返', 'nats'],
  ['PostgreSQL 应用侧 SQL', 'db'],
  ['继电器下发至 ACK', 'relay'],
] as const

const first = (series?: Sample) => series?.values?.[0]?.value

function health(value: number | undefined, ok: string, failed: string) {
  if (value === undefined) return <Tag>未采集</Tag>
  return <Tag color={value === 1 ? 'green' : 'red'}>{value === 1 ? ok : failed}</Tag>
}

export default function MonitoringPage() {
  const [tab, setTab] = useState('overview')
  const [resourceNode, setResourceNode] = useState<string>()
  const [window, setWindow] = useState<Window>('1h')
  const [instance, setInstance] = useState<string>()
  const [operation, setOperation] = useState<string>()
  const [onlyFailures, setOnlyFailures] = useState(false)
  const query = useMonitoring(window, tab === 'performance' ? instance : undefined)
  const data = query.data
  const series = data?.series ?? {}
  const resources = data?.resources ?? []
  const selectedResource =
    resources.find(({ node }) => node === resourceNode) ?? (resourceNode ? undefined : resources[0])
  const disks = resources.flatMap(({ disks }) => disks ?? [])
  const maxDisk = disks.length ? Math.max(...disks.map(({ percent }) => percent)) : undefined
  const match = (key: string, label: string, value: string) =>
    series[key]?.find((sample) => sample.labels[label] === value)
  const targets = (series.up ?? [])
    .map(({ labels, values }) => ({
      instance: labels.instance,
      job: labels.job,
      up: values?.[0]?.value,
      dependencies: series.dependencies?.filter((sample) => sample.labels.instance === labels.instance) ?? [],
      ready: first(match('ready', 'instance', labels.instance)),
      time: first(
        series.scrapeTime?.find(
          (sample) => sample.labels.job === labels.job && sample.labels.instance === labels.instance,
        ),
      ),
    }))
    .sort((a, b) => a.job.localeCompare(b.job) || a.instance.localeCompare(b.instance))
  const failed = targets.filter((target) => target.up === 0 || target.ready === 0)
  const rows = (series.count ?? [])
    .map(({ labels, values }) => ({
      name: labels.operation,
      count: values?.[0]?.value,
      p95: first(match('operationP95', 'operation', labels.operation)),
      p99: first(match('operationP99', 'operation', labels.operation)),
      errors: first(match('operationErrors', 'operation', labels.operation)),
    }))
    .filter((row) => (row.count ?? 0) > 0)
  const at = data?.at ?? 0
  const overviewStats = [
    { title: '5xx 率 · 5 分钟', key: 'errors', unit: '%' },
    { title: 'HTTP P95 · 5 分钟', key: 'http95', unit: 'ms' },
  ]
  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-xl font-semibold">系统监控</h1>
          {at > 0 && data && (
            <span className="text-fg-tertiary text-xs">最近采样 {new Date(at * 1000).toLocaleTimeString()}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="self-center text-fg-tertiary text-xs">每 15 秒采样</span>
          <Button loading={query.isFetching} onClick={() => void query.refetch()}>
            刷新
          </Button>
        </div>
      </div>
      {query.isPending && <Skeleton active />}
      {query.isError && (
        <Alert
          showIcon
          type="error"
          title="获取监控数据失败"
          description={data ? '页面保留上次查询的数据。' : '请稍后重试。'}
        />
      )}
      {data && targets.length === 0 && <Alert showIcon type="info" title="等待首次采样" />}
      {data && (
        <>
          <Tabs
            activeKey={tab}
            onChange={setTab}
            destroyOnHidden
            items={[
              {
                key: 'overview',
                label: '运行总览',
                children: (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                      <Card size="small">
                        <button
                          type="button"
                          onClick={() => setOnlyFailures(!onlyFailures)}
                          className="block w-full cursor-pointer text-left"
                        >
                          <Statistic
                            title="异常实例"
                            value={targets.length ? `${failed.length} / ${targets.length}` : '—'}
                          />
                        </button>
                      </Card>
                      {overviewStats.map(({ title, key, unit }) => {
                        const value = series[key]?.[0]?.values?.find(({ time }) => time === at)?.value
                        return (
                          <Card key={key} size="small">
                            <Statistic
                              title={title}
                              value={format(value)}
                              suffix={value === undefined ? undefined : unit}
                            />
                          </Card>
                        )
                      })}
                      <Card size="small">
                        <button
                          type="button"
                          onClick={() => {
                            setResourceNode(
                              resources.find(({ disks }) => disks?.some(({ percent }) => percent === maxDisk))?.node,
                            )
                            setTab('resources')
                          }}
                          className="block w-full cursor-pointer text-left"
                        >
                          <Statistic
                            title="最高磁盘使用率"
                            value={format(maxDisk)}
                            suffix={maxDisk === undefined ? undefined : '%'}
                          />
                        </button>
                      </Card>
                    </div>
                    <Card
                      title="服务状态"
                      size="small"
                      extra={
                        <Button type="link" onClick={() => setOnlyFailures(!onlyFailures)}>
                          {onlyFailures ? '显示全部' : '仅异常'}
                        </Button>
                      }
                    >
                      {data.combined && (
                        <div className="mb-2 text-fg-tertiary text-xs">单进程模式，资源统计由三个组件共享。</div>
                      )}
                      <Table
                        size="small"
                        rowKey="instance"
                        dataSource={onlyFailures ? failed : targets}
                        pagination={false}
                        expandable={{
                          rowExpandable: (row) => row.dependencies.length > 0,
                          expandedRowRender: (row) =>
                            row.dependencies.map((sample) => (
                              <span key={sample.labels.dependency} className="mr-3">
                                {sample.labels.dependency} {health(first(sample), '正常', '异常')}
                              </span>
                            )),
                        }}
                        columns={[
                          {
                            title: '服务',
                            render: (_, row) => (
                              <Button
                                type="link"
                                onClick={() => {
                                  setResourceNode(data.combined ? 'server' : row.instance)
                                  setTab('resources')
                                }}
                              >
                                {nodeLabel(row.instance)}
                              </Button>
                            ),
                          },
                          { title: '就绪', render: (_, row) => health(row.ready, '就绪', '未就绪') },
                          { title: '采集', render: (_, row) => health(row.up, '正常', '失败') },
                          {
                            title: 'CPU',
                            render: (_, row) => {
                              const value = resources.find(({ node }) => node === row.instance)?.cpuPercent
                              return value === undefined ? '—' : `${format(value)}%`
                            },
                          },
                          {
                            title: '内存',
                            render: (_, row) => {
                              const value = memoryPercent(resources.find(({ node }) => node === row.instance)?.memory)
                              return value === undefined ? '—' : `${format(value)}%`
                            },
                          },
                          {
                            title: '最高磁盘',
                            render: (_, row) => {
                              const mounts = resources.find(({ node }) => node === row.instance)?.disks
                              return mounts?.length
                                ? `${format(Math.max(...mounts.map(({ percent }) => percent)))}%`
                                : '—'
                            },
                          },
                          {
                            title: '采样时间',
                            render: (_, row) => (row.time ? new Date(row.time * 1000).toLocaleTimeString() : '—'),
                          },
                        ]}
                      />
                    </Card>
                  </div>
                ),
              },
              {
                key: 'resources',
                label: '资源监控',
                children: <ResourcePanel resource={selectedResource} at={at} window={window} />,
              },
              {
                key: 'performance',
                label: '请求性能',
                children: (
                  <div className="space-y-4">
                    <section id="monitoring-traffic" className="grid grid-cols-2 gap-3">
                      <Trend
                        title="HTTP 请求速率"
                        unit="req/s"
                        lines={[{ name: '请求速率', sample: series.requests?.[0] }]}
                        at={at}
                        window={window}
                      />
                      <Trend
                        title="HTTP 5xx 率"
                        unit="%"
                        lines={[{ name: '5xx 率', sample: series.errors?.[0] }]}
                        at={at}
                        window={window}
                      />
                    </section>
                    <section id="monitoring-latency" className="grid gap-3 grid-cols-2">
                      {latency.map(([title, key]) => (
                        <Trend
                          key={key}
                          title={title}
                          unit="ms"
                          at={at}
                          window={window}
                          lines={['50', '95'].map((q) => ({ name: `P${q}`, sample: series[key + q]?.[0] }))}
                        />
                      ))}
                    </section>
                    <Card size="small" title="慢接口排行">
                      <Table
                        size="small"
                        rowKey="name"
                        dataSource={rows}
                        scroll={{ x: 640 }}
                        columns={[
                          {
                            title: '接口',
                            dataIndex: 'name',
                            render: (name: string) => (
                              <Button type="link" onClick={() => setOperation(name)}>
                                {name}
                              </Button>
                            ),
                          },
                          {
                            title: '请求数',
                            sorter: (a, b) => (a.count ?? -1) - (b.count ?? -1),
                            render: (_, row) => format(Math.round(row.count ?? 0)),
                          },
                          {
                            title: 'P95 (ms)',
                            defaultSortOrder: 'descend',
                            sorter: (a, b) => (a.p95 ?? -1) - (b.p95 ?? -1),
                            render: (_, row) => format(row.p95),
                          },
                          {
                            title: 'P99 (ms)',
                            sorter: (a, b) => (a.p99 ?? -1) - (b.p99 ?? -1),
                            render: (_, row) => format(row.p99),
                          },
                          {
                            title: '5xx (%)',
                            sorter: (a, b) => (a.errors ?? -1) - (b.errors ?? -1),
                            render: (_, row) => format(row.errors),
                          },
                        ]}
                      />
                    </Card>
                  </div>
                ),
              },
            ]}
            tabBarExtraContent={
              tab === 'overview' ? null : (
                <div className="flex gap-2">
                  <Segmented<Window>
                    value={window}
                    onChange={setWindow}
                    options={[
                      { value: '15m', label: '15 分钟' },
                      { value: '1h', label: '1 小时' },
                      { value: '24h', label: '24 小时' },
                    ]}
                  />
                  {tab === 'resources' ? (
                    <Select
                      aria-label="资源节点"
                      className="min-w-36"
                      value={data.combined ? 'server' : (resourceNode ?? selectedResource?.node)}
                      onChange={setResourceNode}
                      options={
                        data.combined
                          ? [{ value: 'server', label: '共享进程' }]
                          : targets.map(({ instance }) => ({ value: instance, label: nodeLabel(instance) }))
                      }
                    />
                  ) : (
                    <Select
                      allowClear
                      aria-label="性能实例"
                      placeholder={data.combined ? '共享进程' : '全部实例'}
                      disabled={data.combined}
                      className="min-w-36"
                      value={instance}
                      onChange={setInstance}
                      options={targets.map(({ instance }) => ({ value: instance, label: nodeLabel(instance) }))}
                    />
                  )}
                </div>
              )
            }
          />
          <Drawer
            title={operation}
            open={operation !== undefined}
            onClose={() => setOperation(undefined)}
            size="large"
            destroyOnHidden
          >
            {operation && (
              <>
                <Trend
                  title="接口 P95"
                  unit="ms"
                  at={at}
                  window={window}
                  lines={[{ name: 'P95', sample: match('operationTrend', 'operation', operation) }]}
                />
                <Table
                  className="mt-4"
                  size="small"
                  rowKey={(sample) => sample.labels.instance}
                  dataSource={series.operationInstances?.filter(({ labels }) => labels.operation === operation)}
                  pagination={false}
                  columns={[
                    { title: '实例', render: (_, sample) => sample.labels.instance },
                    { title: 'P95 (ms)', render: (_, sample) => format(first(sample)) },
                  ]}
                />
              </>
            )}
          </Drawer>
        </>
      )}
    </div>
  )
}
