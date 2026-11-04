import type { ReactNode } from 'react'

export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7v10H3Z" />
        <path d="M9 20v-7h6v7" />
      </>
    ),
    devices: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    alarms: (
      <>
        <path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5Z" />
        <path d="M10 21h4" />
      </>
    ),
    me: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    sensor: (
      <>
        <path d="M4 12h4l2-7 4 14 2-7h4" />
        <rect x="2" y="2" width="20" height="20" rx="5" />
      </>
    ),
    relay: (
      <>
        <rect x="2" y="7" width="20" height="10" rx="5" />
        <circle cx="8" cy="12" r="3" />
      </>
    ),
    camera: (
      <>
        <rect x="2" y="6" width="14" height="12" rx="3" />
        <path d="m16 10 6-4v12l-6-4Z" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18M7 15l4-6 4 3 5-8" />
      </>
    ),
    map: (
      <>
        <path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16m6-14v16" />
      </>
    ),
    filter: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="8" cy="6" r="2" />
        <circle cx="16" cy="12" r="2" />
        <circle cx="10" cy="18" r="2" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.devices}
    </svg>
  )
}
