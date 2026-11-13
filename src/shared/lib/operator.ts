import { authKeys } from '@/api/authKeys'
import { queryClient } from '@/app/queryClient'
import type { Me } from '@/lib/portal'

/** 当前登录用户的操作人名称。控制、解除接管、处理告警都由调用方传给后端。 */
export function currentOperatorName(max: number) {
  const me = queryClient.getQueryData<Me>(authKeys.me)
  if (!me) return ''
  return (me.nickname.trim() || me.username.trim()).slice(0, max)
}
