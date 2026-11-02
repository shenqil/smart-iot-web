/** 首次路由加载不强制下载 PC 组件库。 */
export function FullPageSpinner() {
  return (
    <div role="status" aria-live="polite" style={{ padding: 24, textAlign: 'center' }}>
      加载中…
    </div>
  )
}
