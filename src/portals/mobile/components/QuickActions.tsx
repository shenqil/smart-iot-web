import { Button } from 'antd-mobile'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { Icon } from './Icon'

const shortcuts = [
  ['sensor', '数据采集', 'devices?capability=sensor'],
  ['relay', '远程控制', 'devices?capability=relay'],
  ['camera', '视频/苗情', 'devices?capability=camera'],
  ['chart', '历史分析', 'devices?capability=sensor&goal=history'],
  ['map', '园区地图', 'map'],
]
export function useQuickActions() {
  const [visible, setVisible] = useState(false),
    movement = useRef({ y: 0, direction: 0 })
  const onScroll = (el: HTMLElement) => {
    const max = el.scrollHeight - el.clientHeight,
      y = Math.max(0, el.scrollTop),
      state = movement.current
    if (max <= 0) return
    if (max - y <= 20) {
      setVisible(true)
      state.y = y
      state.direction = 0
      return
    }
    const delta = y - state.y,
      direction = Math.sign(delta)
    if (direction !== state.direction && Math.abs(delta) > 2) {
      state.direction = direction
      state.y = y
      return
    }
    if (Math.abs(delta) >= 16) {
      setVisible(delta < 0)
      state.y = y
    }
  }
  return {
    visible,
    onScroll,
    open: () => setVisible(true),
    close: () => {
      setVisible(false)
      movement.current.direction = 0
    },
  }
}
export function QuickActions({
  base,
  visible,
  open,
  close,
}: {
  base: string
  visible: boolean
  open: () => void
  close: () => void
}) {
  return visible ? (
    <nav className="h5-quick-dock" aria-label="快捷入口">
      <div className="h5-row">
        <span>常用功能</span>
        <Button size="mini" fill="none" onClick={close}>
          收起
        </Button>
      </div>
      <div className="h5-shortcuts">
        {shortcuts.map(([icon, label, path]) => (
          <Link key={path} to={`${base}/${path}`}>
            <Icon name={icon} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  ) : (
    <Button className="h5-fab" color="primary" onClick={open} aria-label="打开快捷入口">
      <Icon name="devices" size={18} />
      <span>快捷</span>
    </Button>
  )
}
