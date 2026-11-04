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
    visibleRef = useRef(false),
    lastY = useRef(0)
  visibleRef.current = visible

  const onScroll = (el: HTMLElement) => {
    const y = Math.max(0, el.scrollTop)
    if (visibleRef.current && Math.abs(y - lastY.current) > 2) {
      setVisible(false)
      visibleRef.current = false
    }
    lastY.current = y
  }
  return {
    visible,
    onScroll,
    open: () => {
      setVisible(true)
      visibleRef.current = true
    },
    close: () => {
      setVisible(false)
      visibleRef.current = false
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
