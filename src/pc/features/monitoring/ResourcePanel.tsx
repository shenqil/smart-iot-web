import { Card, Empty, Progress, Statistic, Table, Tag } from 'antd'
import type { Schemas } from '@/api/client'
import { format, type Sample, Trend, type Window } from './Trend'

type Resource = Schemas['AdminMonitoringResource']
type Point = Schemas['AdminMonitoringResourcePoint']

export const nodeLabel = (node: string) => ({ server: 'Server', core: 'Core', gateway: 'Gateway' })[node] ?? node
export const memoryPercent = (memory?: Resource['memory']) =>
  memory && memory.total > 0 ? (memory.used / memory.total) * 100 : undefined

const scopeLabel = (scope?: string) => ({ host: '主机', cgroup: 'cgroup 限额' })[scope ?? ''] ?? '—'
const gib = (bytes: number) => bytes / 1024 ** 3
const capacity = (bytes?: number) => (bytes === undefined ? '—' : `${format(gib(bytes))} GiB`)

export function ResourcePanel({ resource, at, window }: { resource?: Resource; at: number; window: Window }) {
  if (!resource)
    return (
      <Card>
        <Empty description="该节点暂无资源采样" />
      </Card>
    )

  const usage = memoryPercent(resource.memory)
  const sample = (key: Exclude<keyof Point, 'time'>, transform = (value: number) => value): Sample => ({
    labels: { instance: resource.node },
    values: (resource.history ?? []).flatMap((point) => {
      const value = point[key]
      return value === undefined ? [] : [{ time: point.time, value: transform(value) }]
    }),
  })
  const cards = [
    {
      title: 'CPU 使用率',
      value: format(resource.cpuPercent),
      unit: resource.cpuPercent === undefined ? '' : '%',
      scope: scopeLabel(resource.cpuScope),
    },
    {
      title: '内存使用率',
      value: format(usage),
      unit: usage === undefined ? '' : '%',
      scope: scopeLabel(resource.memory?.scope),
      detail: resource.memory && `${capacity(resource.memory.used)} / ${capacity(resource.memory.total)}`,
    },
    {
      title: '进程 CPU',
      value: format(resource.processCores),
      unit: resource.processCores === undefined ? '' : '核',
      scope: '服务进程',
    },
    { title: '进程 RSS', value: capacity(resource.processRss), unit: '', scope: '服务进程' },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {cards.map(({ title, value, unit, scope, detail }) => (
          <Card size="small" key={title}>
            <Statistic title={title} value={value} suffix={unit} />
            <div className="mt-2 flex flex-wrap items-center gap-1 text-fg-tertiary text-xs">
              <Tag>{scope}</Tag>
              {detail}
            </div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Trend
          title="节点 CPU 使用率"
          unit="%"
          at={at}
          window={window}
          lines={[{ name: '使用率', sample: sample('cpuPercent') }]}
        />
        <Trend
          title="节点内存使用率"
          unit="%"
          at={at}
          window={window}
          lines={[{ name: '使用率', sample: sample('memoryPercent') }]}
        />
        <Trend
          title="进程 CPU"
          unit="核"
          at={at}
          window={window}
          lines={[{ name: 'CPU 核数', sample: sample('processCores') }]}
        />
        <Trend
          title="进程 RSS"
          unit="GiB"
          at={at}
          window={window}
          lines={[{ name: 'RSS', sample: sample('processRss', gib) }]}
        />
      </div>
      <Card title="磁盘与挂载点" size="small">
        <Table
          size="small"
          rowKey="mount"
          dataSource={resource.disks ?? []}
          pagination={false}
          columns={[
            { title: '挂载点', dataIndex: 'mount' },
            { title: '监控路径', render: (_, disk) => (disk.paths ?? []).join('、') },
            {
              title: '使用率',
              width: 200,
              render: (_, disk) => <Progress percent={Math.round(disk.percent)} size="small" />,
            },
            { title: '已用', render: (_, disk) => capacity(disk.used) },
            { title: '可用', render: (_, disk) => capacity(disk.available) },
            { title: '总容量', render: (_, disk) => capacity(disk.total) },
          ]}
        />
      </Card>
    </div>
  )
}
