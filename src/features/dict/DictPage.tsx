import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, InputNumber, Select, Space } from 'antd'
import type { Key, ReactNode } from 'react'
import { useState } from 'react'
import { api, unwrap } from '@/api/client'
import type { PageResult } from '@/api/page'
import type { PageParams } from '@/api/types'
import { FormDrawer } from '@/components/form/FormDrawer'
import { OssUpload } from '@/components/form/OssUpload'
import { type PageColumn, PageTable } from '@/components/table/PageTable'
import { affectedText, confirmAction } from '@/lib/confirm'
import { formatValue, RESOLUTION_OPTIONS } from '@/lib/resolution'
import { fmtDateTime } from '@/lib/time'

type DictKind = 'device-types' | 'standard-sensors' | 'standard-relays'

interface DictRow {
  id: number
  name: string
  sort: number
  createdAt: string
  [k: string]: unknown
}

interface DictConfig {
  title: string
  keywordPlaceholder: string
  scene: 'device-type-icon' | 'sensor-icon' | 'relay-icon'
  iconField: 'icon' | 'url'
  columns: PageColumn<DictRow>[]
  fields: ReactNode
  defaults: Record<string, unknown>
}

const Icon = ({ src }: { src?: unknown }) =>
  src ? (
    <img src={String(src)} alt="" className="size-7 rounded object-contain" />
  ) : (
    <span className="inline-block size-7 rounded bg-layout" />
  )

const nameField = (max: number) => (
  <Form.Item name="name" label="名称" rules={[{ required: true, whitespace: true, message: '请输入名称' }, { max }]}>
    <Input placeholder="名称唯一" />
  </Form.Item>
)
const sortField = (
  <Form.Item name="sort" label="排序" tooltip="越小越靠前">
    <InputNumber className="w-full" precision={0} />
  </Form.Item>
)

const CONFIGS: Record<DictKind, DictConfig> = {
  'device-types': {
    title: '设备类型',
    keywordPlaceholder: '名称 / 描述',
    scene: 'device-type-icon',
    iconField: 'icon',
    defaults: { sort: 0 },
    columns: [
      { title: '图标', dataIndex: 'icon', width: 64, render: (v) => <Icon src={v} /> },
      { title: '名称', dataIndex: 'name', sortField: 'name' },
      { title: '描述', dataIndex: 'description', ellipsis: true, render: (v) => v || '—' },
    ],
    fields: (
      <>
        {nameField(50)}
        <Form.Item name="description" label="描述" rules={[{ max: 2000 }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
      </>
    ),
  },
  'standard-sensors': {
    title: '标准传感器',
    keywordPlaceholder: '名称 / 单位',
    scene: 'sensor-icon',
    iconField: 'url',
    defaults: { sort: 0, resolution: 0.1 },
    columns: [
      { title: '图标', dataIndex: 'url', width: 64, render: (v) => <Icon src={v} /> },
      { title: '名称', dataIndex: 'name', sortField: 'name' },
      { title: '单位', dataIndex: 'unit', render: (v) => v || '—' },
      {
        title: '量程',
        render: (_, r) =>
          `${formatValue(r.minValue as number, r.resolution as number)} ~ ${formatValue(r.maxValue as number, r.resolution as number)}`,
      },
      { title: '分辨率', dataIndex: 'resolution', render: (v) => (v ? v : '未配置') },
    ],
    fields: (
      <>
        {nameField(100)}
        <Space.Compact block>
          <Form.Item name="minValue" label="量程下限" className="w-1/2">
            <InputNumber className="w-full" />
          </Form.Item>
          <Form.Item
            name="maxValue"
            label="量程上限"
            className="w-1/2"
            dependencies={['minValue']}
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, v) =>
                  v == null || getFieldValue('minValue') == null || v >= getFieldValue('minValue')
                    ? Promise.resolve()
                    : Promise.reject(new Error('上限不能小于下限')),
              }),
            ]}
          >
            <InputNumber className="w-full" />
          </Form.Item>
        </Space.Compact>
        <Space.Compact block>
          <Form.Item name="unit" label="单位" className="w-1/2" rules={[{ max: 20 }]}>
            <Input placeholder="如 ℃、%RH、ppm" />
          </Form.Item>
          <Form.Item
            name="resolution"
            label="分辨率"
            className="w-1/2"
            tooltip="物理值 = 原始值 × 分辨率，并按分辨率舍入"
          >
            <Select options={RESOLUTION_OPTIONS} />
          </Form.Item>
        </Space.Compact>
      </>
    ),
  },
  'standard-relays': {
    title: '标准继电器',
    keywordPlaceholder: '名称',
    scene: 'relay-icon',
    iconField: 'url',
    defaults: { sort: 0 },
    columns: [
      { title: '图标', dataIndex: 'url', width: 64, render: (v) => <Icon src={v} /> },
      { title: '名称', dataIndex: 'name', sortField: 'name' },
    ],
    fields: nameField(100),
  },
}

const path = (kind: DictKind) => `/api/v1/admin/${kind}` as '/api/v1/admin/device-types'
const itemPath = (kind: DictKind) => `/api/v1/admin/${kind}/{id}` as '/api/v1/admin/device-types/{id}'

/** 字典管理 (FRONTEND_DESIGN §3.6)：三个字典由同一份配置生成 */
export function DictPage({ kind }: { kind: DictKind }) {
  const cfg = CONFIGS[kind]
  const qc = useQueryClient()
  const [editing, setEditing] = useState<DictRow | 'new' | null>(null)
  const listKey = ['admin', 0, 'dicts', kind]

  const refresh = () => {
    qc.invalidateQueries({ queryKey: listKey })
    qc.invalidateQueries({ queryKey: ['dict'] })
  }

  const fetcher = (q: PageParams) =>
    unwrap(api.GET(path(kind), { params: { query: q as never } })) as Promise<PageResult<DictRow>>

  const remove = (ids: Key[], clear?: () => void) =>
    confirmAction({
      title: `删除 ${ids.length} 个${cfg.title}？`,
      content:
        kind === 'device-types'
          ? '引用该类型的设备将变为"未分类"。'
          : '已配置到设备上的通道不受影响 (通道配置是快照)。',
      okText: '删除',
      onOk: () => unwrap(api.DELETE(path(kind), { body: { ids: ids as number[] } })),
      successText: affectedText('删除'),
      onDone: () => {
        clear?.()
        refresh()
      },
    })

  const save = async (values: Record<string, unknown>) => {
    const body = { ...values, name: String(values.name ?? '').trim() } as never
    if (editing === 'new') await unwrap(api.POST(path(kind), { body }))
    else if (editing) await unwrap(api.PUT(itemPath(kind), { params: { path: { id: editing.id } }, body }))
    refresh()
  }

  const columns: PageColumn<DictRow>[] = [
    ...cfg.columns,
    { title: '排序', dataIndex: 'sort', width: 80, sortField: 'sort' },
    { title: '创建时间', dataIndex: 'createdAt', width: 160, sortField: 'createdAt', render: fmtDateTime },
    {
      title: '操作',
      width: 140,
      fixed: 'right',
      render: (_, r) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => setEditing(r)}>
            编辑
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => remove([r.id])}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageTable<DictRow>
        queryKey={listKey}
        fetcher={fetcher}
        columns={columns}
        rowKey="id"
        keywordPlaceholder={cfg.keywordPlaceholder}
        defaultSort="sort"
        toolbar={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>
            新建{cfg.title}
          </Button>
        }
        batchActions={(keys, _rows, clear) => (
          <Button danger size="small" onClick={() => remove(keys, clear)}>
            批量删除
          </Button>
        )}
      />
      <FormDrawer<Record<string, unknown>>
        open={editing !== null}
        title={editing === 'new' ? `新建${cfg.title}` : `编辑${cfg.title}`}
        width={480}
        initialValues={editing === 'new' ? cfg.defaults : (editing ?? undefined)}
        onClose={() => setEditing(null)}
        onSubmit={save}
        conflictField="name"
      >
        <Form.Item name={cfg.iconField} label="图标">
          <OssUpload scene={cfg.scene} size={72} />
        </Form.Item>
        {cfg.fields}
        {sortField}
      </FormDrawer>
    </>
  )
}

export const DeviceTypesPage = () => <DictPage kind="device-types" />
export const StandardSensorsPage = () => <DictPage kind="standard-sensors" />
export const StandardRelaysPage = () => <DictPage kind="standard-relays" />
