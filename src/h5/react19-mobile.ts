import { unstableSetRender } from 'antd-mobile'
import { createRoot, type Root } from 'react-dom/client'

/** antd-mobile v5 的 Toast/Dialog 等命令式组件使用 React 19 createRoot。 */
const roots = new WeakMap<Element | DocumentFragment, Root>()
unstableSetRender((node, container) => {
  let root = roots.get(container)
  if (!root) {
    root = createRoot(container)
    roots.set(container, root)
  }
  root.render(node)
  return async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    root.unmount()
    roots.delete(container)
  }
})
