import fs from 'node:fs'
import path from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { versionPlugin } from '../../vite-plugin-version'

describe('versionPlugin', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('injects __BUILD_TIMESTAMP__ into HTML head', () => {
    const plugin = versionPlugin() as Plugin & {
      transformIndexHtml: (html: string) => string
    }

    const html = '<!DOCTYPE html><html><head><title>Test</title></head><body></body></html>'
    const transformed = plugin.transformIndexHtml(html)

    expect(transformed).toContain('window.__BUILD_TIMESTAMP__')
    expect(transformed).toMatch(/window\.__BUILD_TIMESTAMP__ = '\d+'/)
  })

  it('writes version.txt in writeBundle hook', () => {
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as unknown as string)
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
    const plugin = versionPlugin() as Plugin & {
      configResolved: (config: ResolvedConfig) => void
      writeBundle: () => void
    }

    const mockConfig = {
      root: '/mock/project',
      build: {
        outDir: 'dist',
      },
    } as unknown as ResolvedConfig

    if (typeof plugin.configResolved === 'function') {
      ;(plugin.configResolved as (config: ResolvedConfig) => void)(mockConfig)
    }
    if (typeof plugin.writeBundle === 'function') {
      ;(plugin.writeBundle as () => void)()
    }

    expect(writeSpy).toHaveBeenCalledTimes(1)
    const [filePath, content] = writeSpy.mock.calls[0]
    expect(filePath).toBe(path.resolve('/mock/project/dist/version.txt'))
    expect(content).toMatch(/^\d+$/)
  })
})
