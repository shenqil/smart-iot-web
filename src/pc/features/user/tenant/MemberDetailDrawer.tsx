import { useQuery } from '@tanstack/react-query'
import { Descriptions, Drawer, Skeleton, Tag } from 'antd'
import { ACTIVE_STATUS, COMPANY_ROLE, EnumTag } from '@/components/StatusTag'
import { useCompanyId } from '@/hooks/session'
import { fmtDateTime } from '@/lib/time'
import { tenantUserApi, tenantUserKeys } from './api'

/** 成员详情 (只读) */
export function MemberDetailDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const cid = useCompanyId()
  const { data: m, isPending } = useQuery({
    queryKey: tenantUserKeys.detail(cid, id ?? 0),
    queryFn: () => tenantUserApi(cid).detail(id as number),
    enabled: id != null,
    staleTime: 0,
  })
  return (
    <Drawer open={id != null} title="成员详情" size={440} onClose={onClose} destroyOnHidden>
      {isPending || !m ? (
        <Skeleton active />
      ) : (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="用户名">{m.username}</Descriptions.Item>
          <Descriptions.Item label="昵称">{m.nickname || '—'}</Descriptions.Item>
          <Descriptions.Item label="手机号">{m.phone || '—'}</Descriptions.Item>
          <Descriptions.Item label="企业角色">
            <EnumTag value={m.role} defs={COMPANY_ROLE} />
          </Descriptions.Item>
          <Descriptions.Item label="账号状态">
            <EnumTag value={m.status} defs={ACTIVE_STATUS} />
            {m.systemRole === 'admin' && <Tag color="purple">平台管理员</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="加入时间">{fmtDateTime(m.joinedAt)}</Descriptions.Item>
          <Descriptions.Item label="注册时间">{fmtDateTime(m.createdAt)}</Descriptions.Item>
        </Descriptions>
      )}
      <div className="mt-4 text-fg-tertiary text-xs">修改成员资料、密码或角色请联系平台管理员。</div>
    </Drawer>
  )
}
