import { json, jsonParseLinter } from '@codemirror/lang-json'
import { linter, lintGutter } from '@codemirror/lint'
import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import { Button, Space, Typography } from 'antd'

const extensions = [json(), linter(jsonParseLinter()), lintGutter(), EditorView.lineWrapping]

/** 解析错误信息 (合法 JSON 返回 null；空串视为不合法) */
export function jsonError(text: string | undefined | null): string | null {
  if (!text?.trim()) return '请输入 JSON'
  try {
    JSON.parse(text)
    return null
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}

/** 格式化 (2 空格缩进)；不合法时原样返回 */
export function formatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

/** Form.Item 校验规则：必须是合法 JSON */
export const jsonRule = {
  validator: (_: unknown, v: string | undefined) => {
    const err = jsonError(v)
    return err ? Promise.reject(new Error(err === '请输入 JSON' ? err : `JSON 格式错误：${err}`)) : Promise.resolve()
  },
}

export interface JsonEditorProps {
  value?: string
  onChange?: (v: string) => void
  height?: number | string
  readOnly?: boolean
}

/** JSON 编辑器 (CodeMirror)：语法高亮、实时语法检查、一键格式化 / 压缩；作为表单控件使用，值为 JSON 字符串 */
export function JsonEditor({ value = '', onChange, height = 360, readOnly }: JsonEditorProps) {
  const valid = jsonError(value) == null
  return (
    <div className="overflow-hidden rounded-md border border-line">
      <CodeMirror
        value={value}
        height={typeof height === 'number' ? `${height}px` : height}
        extensions={extensions}
        editable={!readOnly}
        basicSetup={{ foldGutter: true, highlightActiveLine: !readOnly, autocompletion: false }}
        onChange={(v) => onChange?.(v)}
      />
      {!readOnly && (
        <div className="flex items-center justify-between border-line border-t bg-layout px-2 py-1">
          <Typography.Text type={valid ? 'secondary' : 'danger'} className="text-xs">
            {valid ? 'JSON 格式正确' : 'JSON 格式错误'}
          </Typography.Text>
          <Space size={0}>
            <Button type="link" size="small" disabled={!valid} onClick={() => onChange?.(formatJson(value))}>
              格式化
            </Button>
            <Button
              type="link"
              size="small"
              disabled={!valid}
              onClick={() => onChange?.(JSON.stringify(JSON.parse(value)))}
            >
              压缩
            </Button>
          </Space>
        </div>
      )}
    </div>
  )
}
