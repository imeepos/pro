/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_APP_TITLE: string
  readonly VITE_MAP_API_KEY: string
  // 添加更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}