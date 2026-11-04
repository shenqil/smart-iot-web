import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Form, Input, Space, Typography } from 'antd'
import type { Key } from 'react'
import { useState } from 'react'
import { api, unwrap } from '@/api/client'
import type { PageResult } from '@/api/page'
import type { PageParams } from '@/api/types'
import { FormDrawer } from '@/components/form/FormDrawer'
import { JsonEditor, jsonRule } from '@/components/form/JsonEditor'
import { type PageColumn, PageTable } from '@/components/table/PageTable'
import { affectedText, confirmAction } from '@/lib/confirm'
import { fmtDateTime } from '@/lib/time'
import { FRONTEND_CONFIG_KEY } from '@/stores/sysConfig'
import { loadFrontendConfig, type SysConfig } from './api'

interface FormValues {
  key: string
  value: string
  description?: string
}

const KEY_PATTERN = /^[a-z][a-z0-9_.-]*$/
const LIST_KEY = ['admin', 0, 'sys-configs']

/** 列表中的单行预览：合法 JSON 压缩为一行，否则原样 */
const preview = (v: string) => {
  try {
    return JSON.stringify(JSON.parse(v))
  } catch {
    return v
  }
}

/** 系统配置 (平台管理)：K/V 配置，value 为 JSON；任意登录用户可按 key 读取 */
export default function SysConfigPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<SysConfig | 'new' | null>(null)

  /** 改动了前端系统配置时，重新加载到 store (当前页面即时生效) */
  const refresh = (keys: string[]) => {
    qc.invalidateQueries({ queryKey: LIST_KEY })
    if (keys.includes(FRONTEND_CONFIG_KEY)) void loadFrontendConfig({ force: true })
  }

  const fetcher = (q: PageParams) =>
    unwrap(api.GET('/api/v1/admin/sys-configs', { params: { query: q as never } })) as Promise<PageResult<SysConfig>>

  const remove = (rows: SysConfig[], clear?: () => void) =>
    confirmAction({
      title: `删除 ${rows.length} 个系统配置？`,
      content: rows.some((r) => r.key === FRONTEND_CONFIG_KEY)
        ? `包含前端系统配置 ${FRONTEND_CONFIG_KEY}，删除后天地图等功能将不可用。`
        : '前端按 key 读取这些配置，删除后相关功能将使用默认值。',
      okText: '删除',
      onOk: () => unwrap(api.DELETE('/api/v1/admin/sys-configs', { body: { ids: rows.map((r) => r.id) } })),
      successText: affectedText('删除'),
      onDone: () => {
        clear?.()
        refresh(rows.map((r) => r.key))
      },
    })

  const save = async (v: FormValues) => {
    const description = v.description?.trim() ?? ''
    if (editing === 'new') {
      await unwrap(api.POST('/api/v1/admin/sys-configs', { body: { key: v.key, value: v.value, description } }))
      refresh([v.key])
    } else if (editing) {
      await unwrap(
        api.PUT('/api/v1/admin/sys-configs/{id}', {
          params: { path: { id: editing.id } },
          body: { value: v.value, description },
        }),
      )
      refresh([editing.key])
    }
  }

  const columns: PageColumn<SysConfig>[] = [
    {
      title: '配置键',
      dataIndex: 'key',
      width: 200,
      sortField: 'key',
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    { title: '描述', dataIndex: 'description', width: 260, ellipsis: true, render: (v) => v || '—' },
    {
      title: '配置值',
      dataIndex: 'value',
      ellipsis: true,
      render: (v: string) => <span className="font-mono text-xs">{preview(v)}</span>,
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 160, sortField: 'updatedAt', render: fmtDateTime },
    {
      title: '操作',
      width: 140,
      fixed: 'right',
      render: (_, r) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => setEditing(r)}>
            编辑
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => remove([r])}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const isNew = editing === 'new'

  return (
    <>
      <PageTable<SysConfig>
        queryKey={LIST_KEY}
        fetcher={fetcher}
        columns={columns}
        rowKey="id"
        keywordPlaceholder="配置键 / 描述"
        defaultSort="key"
        toolbar={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>
            新建配置
          </Button>
        }
        batchActions={(_keys: Key[], rows, clear) => (
          <Button danger size="small" onClick={() => remove(rows, clear)}>
            批量删除
          </Button>
        )}
      />
      <FormDrawer<FormValues>
        open={editing !== null}
        title={isNew ? '新建系统配置' : '编辑系统配置'}
        width={720}
        initialValues={isNew ? { value: '{\n  \n}' } : (editing ?? undefined)}
        onClose={() => setEditing(null)}
        onSubmit={save}
        conflictField="key"
      >
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          title="任意登录用户都可以按配置键读取配置值，请勿存放服务端密钥 (如 OSS AccessKey、天地图服务端 Key)。"
        />
        <Form.Item
          name="key"
          label="配置键"
          tooltip="前端按配置键读取，创建后不可修改"
          rules={[
            { required: true, message: '请输入配置键' },
            { max: 100 },
            { pattern: KEY_PATTERN, message: '小写字母开头，只能包含小写字母、数字、_ . -' },
          ]}
        >
          <Input placeholder="如 frontend" disabled={!isNew} />
        </Form.Item>
        <Form.Item name="description" label="描述" rules={[{ max: 500 }]}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="value" label="配置值 (JSON)" rules={[{ required: true, message: '请输入 JSON' }, jsonRule]}>
          <JsonEditor height={360} />
        </Form.Item>
      </FormDrawer>
    </>
  )
}
