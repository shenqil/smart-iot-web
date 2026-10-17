import { Link } from 'react-router'

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'Smart IoT 物联网平台'

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img">
      <title>{APP_TITLE}</title>
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <circle cx="16" cy="18" r="3.5" fill="#fff" />
      <path
        d="M9 15a7 7 0 0 1 14 0M5 15a11 11 0 0 1 22 0"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Brand({ to = '/', collapsed = false }: { to?: string; collapsed?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2 whitespace-nowrap text-fg no-underline hover:text-fg">
      <span className="text-primary">
        <BrandMark />
      </span>
      {!collapsed && <span className="font-semibold text-[15px]">{APP_TITLE}</span>}
    </Link>
  )
}
