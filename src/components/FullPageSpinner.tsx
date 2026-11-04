/** 首次路由加载与全局懒加载回退：不依赖外部 UI 库，纯 CSS + SVG 高性能渲染。 */
export function FullPageSpinner({ text = '智能物联网' }: { text?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="siot-splash"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        width: '100%',
        padding: '24px',
        boxSizing: 'border-box',
        background: 'radial-gradient(ellipse at 50% 35%, #ebf5ee 0%, #f4f7f4 65%, #eef3ef 100%)',
        color: '#1d3b2e',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
      }}
    >
      <div style={{ position: 'relative', width: 64, height: 64, marginBottom: 18 }}>
        <svg
          aria-hidden="true"
          viewBox="0 0 50 50"
          style={{
            width: 64,
            height: 64,
            animation: 'siot-spin 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          }}
        >
          <circle cx="25" cy="25" r="20" fill="none" stroke="#d4e8dd" strokeWidth="3.5" />
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="#16765f"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="80, 150"
            strokeDashoffset="0"
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#16765f',
          }}
        >
          <svg
            aria-hidden="true"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: '#1d3d30',
          marginBottom: 6,
        }}
      >
        {text}
      </div>
      <div
        style={{
          fontSize: 12,
          color: '#6e8578',
          letterSpacing: '0.06em',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span>系统加载中</span>
        <span style={{ display: 'inline-flex', animation: 'siot-pulse 1.4s ease-in-out infinite' }}>…</span>
      </div>
      <style>{`
        @keyframes siot-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes siot-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
