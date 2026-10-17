import type { FormInstance } from 'antd'
import { type ApiError, toFormErrors } from '@/api/errors'

/** 422 字段错误回填到表单；返回无法对应字段的错误文案 */
export function applyFormErrors(
  // biome-ignore lint/suspicious/noExplicitAny: 适用于任意表单
  form: FormInstance<any>,
  err: ApiError,
): string[] {
  const { fields, rest } = toFormErrors(err)
  form.setFields(fields)
  return rest
}

export const isValidationError = (e: ApiError) => e.status === 422 && e.details.length > 0
