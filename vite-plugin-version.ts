import fs from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'

export function versionPlugin(): Plugin {
  // 在插件初始化时生成毫秒时间戳，确保在 transformIndexHtml 时可用
  const buildTimestamp = Date.now().toString()
  let outDir = 'dist'

  return {
    name: 'version-plugin',
    configResolved(config: ResolvedConfig) {
      outDir = resolve(config.root, config.build.outDir)
    },
    writeBundle() {
      // 在构建完成后写入 version.txt 文件，只包含毫秒时间戳
      fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(resolve(outDir, 'version.txt'), buildTimestamp, 'utf-8')
      console.log(`✓ Version file generated with timestamp: ${buildTimestamp}`)
    },
    transformIndexHtml(html) {
      // 在 HTML 中注入时间戳到 window 全局变量
      return html.replace(
        '<head>',
        `<head>
    <script>
      window.__BUILD_TIMESTAMP__ = '${buildTimestamp}';
    </script>`,
      )
    },
  }
}
