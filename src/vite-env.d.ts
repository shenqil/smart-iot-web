/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_BIZ_TZ: string
  readonly VITE_TDT_BROWSER_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
