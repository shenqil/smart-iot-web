import { describe, expect, it } from 'vitest'
import { formatJson, jsonError, jsonRule } from './JsonEditor'

describe('JsonEditor 工具', () => {
  it('jsonError', () => {
    expect(jsonError('{"a":1}')).toBeNull()
    expect(jsonError('[1, 2]')).toBeNull()
    expect(jsonError('')).toBe('请输入 JSON')
    expect(jsonError('  ')).toBe('请输入 JSON')
    expect(jsonError('{a:1}')).not.toBeNull()
  })
  it('formatJson', () => {
    expect(formatJson('{"a":[1,2]}')).toBe('{\n  "a": [\n    1,\n    2\n  ]\n}')
    expect(formatJson('not json')).toBe('not json')
  })
  it('jsonRule', async () => {
    await expect(jsonRule.validator(null, '{}')).resolves.toBeUndefined()
    await expect(jsonRule.validator(null, '{')).rejects.toThrow(/JSON 格式错误/)
  })
})
