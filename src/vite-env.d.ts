/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_BIZ_TZ: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  __BUILD_TIMESTAMP__?: string
}
