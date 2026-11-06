import { useEffect, useRef, useState } from 'react'

interface UseInViewOptions {
  rootMargin?: string
  triggerOnce?: boolean
}

/** 元素是否在可视区域内 (卡片按需加载实时值)；不支持 IntersectionObserver 时视为可见 */
export function useInView<T extends Element>(options: string | UseInViewOptions = '100px') {
  const rootMargin = typeof options === 'string' ? options : (options.rootMargin ?? '100px')
  const triggerOnce = typeof options === 'object' ? (options.triggerOnce ?? false) : false

  const ref = useRef<T>(null)
  const [inView, setInView] = useState(typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true)
          if (triggerOnce) io.disconnect()
        } else if (!triggerOnce) {
          setInView(false)
        }
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin, triggerOnce])
  return { ref, inView }
}
