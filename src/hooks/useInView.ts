import { useEffect, useRef, useState } from 'react'

/** 元素是否在可视区域内 (卡片按需加载实时值)；不支持 IntersectionObserver 时视为可见 */
export function useInView<T extends Element>(rootMargin = '100px') {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])
  return { ref, inView }
}
