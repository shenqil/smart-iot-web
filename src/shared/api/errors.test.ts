import { describe, expect, it } from 'vitest'
import { ApiError, errorText, toFieldPath, toFormErrors } from './errors'

describe('toFieldPath', () => {
  it('解析 body 字段与数组下标', () => {
    expect(toFieldPath('body.name')).toEqual(['name'])
    expect(toFieldPath('body.members[0].userId')).toEqual(['members', 0, 'userId'])
    expect(toFieldPath('body.sensors[2].alertConfigs[1].threshold')).toEqual([
      'sensors',
      2,
      'alertConfigs',
      1,
      'threshold',
    ])
  })
  it('非 body 位置返回 null', () => {
    expect(toFieldPath('query.pageSize')).toBeNull()
    expect(toFieldPath(undefined)).toBeNull()
  })
})

describe('toFormErrors / errorText', () => {
  it('拆分字段错误与其他错误', () => {
    const e = new ApiError(422, 'VALIDATION_FAILED', '参数校验失败', [
      { location: 'body.name', message: '不能为空' },
      { location: 'query.page', message: '页码错误' },
    ])
    expect(toFormErrors(e)).toEqual({ fields: [{ name: ['name'], errors: ['不能为空'] }], rest: ['页码错误'] })
  })
  it('5xx 附带请求号', () => {
    expect(errorText(new ApiError(500, 'INTERNAL_ERROR', '服务器内部错误', [], 'req-1'))).toBe(
      '服务器内部错误 (请求号 req-1)',
    )
  })
})
