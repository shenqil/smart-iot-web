import { fileURLToPath, URL } from 'node:url'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { versionPlugin } from './vite-plugin-version.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.DEV_API_TARGET || 'https://agent.iotysxx.com'
  const tdtKey = env.DEV_TDT_SERVER_KEY || ''

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      versionPlugin(),
      {
        name: 'h5-history-fallback',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            const url = req.url?.split('?')[0] ?? ''
            if ((url === '/h5' || url.startsWith('/h5/')) && !url.includes('.')) {
              req.url = '/h5/index.html'
            }
            next()
          })
        },
      },
    ],
    resolve: {
      alias: {
        '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
        '@pc': fileURLToPath(new URL('./src/pc', import.meta.url)),
        '@h5': fileURLToPath(new URL('./src/h5', import.meta.url)),
        '@/api': fileURLToPath(new URL('./src/shared/api', import.meta.url)),
        '@/stores': fileURLToPath(new URL('./src/shared/stores', import.meta.url)),
        '@/hooks': fileURLToPath(new URL('./src/shared/hooks', import.meta.url)),
        '@/lib': fileURLToPath(new URL('./src/shared/lib', import.meta.url)),
        '@/types': fileURLToPath(new URL('./src/shared/types', import.meta.url)),
        '@/utils': fileURLToPath(new URL('./src/shared/utils', import.meta.url)),
        '@/features': fileURLToPath(new URL('./src/pc/features', import.meta.url)),
        '@/components': fileURLToPath(new URL('./src/pc/components', import.meta.url)),
        '@/layouts': fileURLToPath(new URL('./src/pc/layouts', import.meta.url)),
        '@/portals': fileURLToPath(new URL('./src/pc/portals', import.meta.url)),
        '@/app': fileURLToPath(new URL('./src/shared', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
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
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        input: {
          main: fileURLToPath(new URL('./index.html', import.meta.url)),
          h5: fileURLToPath(new URL('./h5/index.html', import.meta.url)),
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
