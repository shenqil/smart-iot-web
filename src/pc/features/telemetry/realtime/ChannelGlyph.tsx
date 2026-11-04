import type { ReactNode } from 'react'
import type { RelayKind, SensorKind } from '../lib/channelKind'

/** 内置线性图标 (24 × 24，描边随 currentColor)：字典与通道都没有上传图标时使用 */
function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

const cloud = 'M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.3 9.6 4.2 4.2 0 0 0 7 18Z'

const SENSOR_PATHS: Record<SensorKind, ReactNode> = {
  temperature: (
    <>
      <path d="M10 13.6V5a2 2 0 1 1 4 0v8.6a4 4 0 1 1-4 0Z" />
      <path d="M12 9.5v6" />
    </>
  ),
  humidity: <path d="M12 3.5c3 3.9 6 7.1 6 10.4a6 6 0 0 1-12 0c0-3.3 3-6.5 6-10.4Z" />,
  soilMoisture: (
    <>
      <path d="M12 3.5c2.2 2.8 4.2 5.1 4.2 7.4a4.2 4.2 0 0 1-8.4 0c0-2.3 2-4.6 4.2-7.4Z" />
      <path d="M4 19c1.6 0 1.6-1.2 3.2-1.2s1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2" />
    </>
  ),
  light: (
    <>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </>
  ),
  co2: (
    <>
      <path d={cloud} />
      <path d="M10.2 12.6a1.4 1.4 0 1 0 0 2.2M13 12.4h.8a1.3 1.3 0 0 1 0 2.6H13v-2.6Z" />
    </>
  ),
  conductivity: <path d="M13.2 3 5.5 13.4h5.6L10.4 21l8.1-10.5h-5.7L13.2 3Z" />,
  ph: (
    <>
      <path d="M9 3h6M10 3v6.2L5.2 17.8A2.2 2.2 0 0 0 7.1 21h9.8a2.2 2.2 0 0 0 1.9-3.2L14 9.2V3" />
      <path d="M7.4 15h9.2" />
    </>
  ),
  wind: (
    <>
      <path d="M3 8.5h10.5a2.5 2.5 0 1 0-2.5-2.5" />
      <path d="M3 15.5h14a2.5 2.5 0 1 1-2.5 2.5" />
      <path d="M3 12h16.5a2 2 0 1 0-2-2" />
    </>
  ),
  rain: (
    <>
      <path d="M7 14h10a3.6 3.6 0 0 0 .5-7.15A5.4 5.4 0 0 0 7.1 5.4 3.8 3.8 0 0 0 7 14Z" />
      <path d="M8 17.5 7 20M12 17.5l-1 2.5M16 17.5 15 20" />
    </>
  ),
  pressure: (
    <>
      <path d="M4.3 17a8.5 8.5 0 1 1 15.4 0" />
      <path d="m12 14 3.6-4.2" />
      <circle cx="12" cy="14.5" r="1.3" />
    </>
  ),
  nutrient: (
    <>
      <path d="M12 21v-8.5" />
      <path d="M12 12.5c0-4 2.6-6.5 7-6.5 0 4.2-2.6 6.5-7 6.5Z" />
      <path d="M12 15c0-3.2-2-5.2-5.6-5.2 0 3.3 2 5.2 5.6 5.2Z" />
    </>
  ),
  particulate: (
    <>
      <circle cx="7" cy="8" r="1.6" />
      <circle cx="15.5" cy="6.5" r="1.2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="6.5" cy="16" r="1.2" />
      <circle cx="17" cy="14" r="1.6" />
      <circle cx="12.5" cy="18.5" r="1" />
    </>
  ),
  level: (
    <>
      <path d="M5 3.5v15A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5v-15" />
      <path d="M5 12c1.2 0 1.2-1 2.3-1s1.2 1 2.4 1 1.2-1 2.3-1 1.2 1 2.3 1 1.2-1 2.4-1 1.1 1 2.3 1" />
    </>
  ),
  electric: (
    <>
      <path d="M13.2 3 5.5 13.4h5.6L10.4 21l8.1-10.5h-5.7L13.2 3Z" />
    </>
  ),
  generic: (
    <>
      <path d="M4.3 17a8.5 8.5 0 1 1 15.4 0" />
      <path d="M12 14V9" />
      <circle cx="12" cy="14.5" r="1.3" />
    </>
  ),
}

const RELAY_PATHS: Record<RelayKind, ReactNode> = {
  valve: (
    <>
      <path d="M4 10v8l8-4-8-4ZM20 10v8l-8-4 8-4Z" />
      <path d="M12 14V7M8.5 6.5h7" />
    </>
  ),
  sprinkler: (
    <>
      <path d="M12 21v-7M9 14h6" />
      <path d="M12 10V9M8 9.5 7 8.6M16 9.5l1-.9M5.5 12.5H4.2M18.5 12.5h1.3" />
      <path d="M12 3.5v2" />
    </>
  ),
  light: (
    <>
      <path d="M9 17.5h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2v.7h5.2v-.7c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" />
    </>
  ),
  fan: (
    <>
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 10.4c-.6-3.3.3-6.4 2.8-6.4 2.6 0 2.8 3.7-2.8 6.4Z" />
      <path d="M13.4 12.8c3.1 1.1 5.4 3.4 4.1 5.6-1.3 2.2-4.6.5-4.1-5.6Z" />
      <path d="M10.6 12.8c-2.5 2.2-5.6 3-6.9.8-1.3-2.2 1.8-4.2 6.9-.8Z" />
    </>
  ),
  pump: (
    <>
      <circle cx="11" cy="13" r="5" />
      <path d="M11 8V4.5h6.5V7M4.5 21h13" />
      <path d="m9.5 11.5 3 1.5-3 1.5v-3Z" />
    </>
  ),
  roller: (
    <>
      <rect x="3" y="3.5" width="18" height="3.5" rx="1.75" />
      <path d="M5.5 7v8.5h13V7" />
      <path d="M12 15.5v3.5M10.5 19h3" />
    </>
  ),
  heater: (
    <path d="M12 3c1.2 3.2 5.5 5.4 5.5 10.2a5.5 5.5 0 0 1-11 0c0-2.6 1.4-4.2 2.6-5.3.3 2 1.3 3.2 2.6 3.2 0-3-1.2-5 .3-8.1Z" />
  ),
  door: (
    <>
      <path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21M4 21h16" />
      <path d="M14.5 12v1" />
    </>
  ),
  alarm: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15L6 16.5Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  power: (
    <>
      <path d="M12 3v8" />
      <path d="M6.6 6.8a7.5 7.5 0 1 0 10.8 0" />
    </>
  ),
}

export const SensorGlyph = ({ kind, className }: { kind: SensorKind; className?: string }) => (
  <Svg className={className}>{SENSOR_PATHS[kind]}</Svg>
)

export const RelayGlyph = ({ kind, className }: { kind: RelayKind; className?: string }) => (
  <Svg className={className}>{RELAY_PATHS[kind]}</Svg>
)
