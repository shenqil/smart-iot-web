import { fileURLToPath, URL } from 'node:url'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.DEV_API_TARGET || 'http://127.0.0.1:10088'
  const tdtKey = env.DEV_TDT_SERVER_KEY || ''

  return {
    plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        // 天地图搜索 / 逆地理编码：与 Nginx 一致，在代理层追加服务端 Key
        '/tdt-api': {
          target: 'https://api.tianditu.gov.cn',
          changeOrigin: true,
          rewrite: (path) => {
            const p = path.replace(/^\/tdt-api/, '')
            return `${p}${p.includes('?') ? '&' : '?'}tk=${tdtKey}`
          },
        },
      },
    },
    build: { chunkSizeWarningLimit: 800 },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
