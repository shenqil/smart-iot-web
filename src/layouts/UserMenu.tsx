import { LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Dropdown } from 'antd'
import { useNavigate } from 'react-router'
import { logout } from '@/features/auth/api'
import { useMe } from '@/hooks/session'

export function UserMenu({ dark = false }: { dark?: boolean }) {
  const me = useMe()
  const navigate = useNavigate()
  const name = me.nickname || me.username
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: [
          { key: 'account', icon: <UserOutlined />, label: '个人中心' },
          { type: 'divider' },
          { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
        ],
        onClick: async ({ key }) => {
          if (key === 'account') navigate('/account')
          if (key === 'logout') {
            await logout()
          }
        },
      }}
    >
      <button
        type="button"
        className={`flex cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2 py-1 ${dark ? 'text-white/85 hover:bg-white/10' : 'text-fg hover:bg-black/5'}`}
      >
        <Avatar size={28} className="bg-primary!">
          {name.slice(0, 1).toUpperCase()}
        </Avatar>
        <span className="max-w-32 truncate">{name}</span>
      </button>
    </Dropdown>
  )
}
