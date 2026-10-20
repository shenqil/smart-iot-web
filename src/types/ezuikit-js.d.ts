/** ezuikit-js 8.x 的最小类型声明 (包内没有类型；只声明本项目用到的部分) */
declare module 'ezuikit-js' {
  export interface EZUIKitPlayerOptions {
    /** 播放器容器 DOM 的 id */
    id: string
    accessToken: string
    /** ezopen://open.ys7.com/{序列号}/{通道号}.live */
    url: string
    width?: number | string
    height?: number | string
    /** 固定模板：simple / security / voice / pcLive / pcRec / mobileLive / mobileRec */
    template?: string
    audio?: boolean
    /** 0 拉伸填充 / 1 等比适配 / 2 等比填充超出隐藏 */
    scaleMode?: 0 | 1 | 2
    language?: 'zh' | 'en'
    /** 解码库地址，默认萤石 CDN */
    staticPath?: string
    handleSuccess?: () => void
    handleError?: (e: { msg?: string; retcode?: number | string; type?: string }) => void
  }

  export class EZUIKitPlayer {
    constructor(options: EZUIKitPlayerOptions)
    static EVENTS: Record<string, string>
    eventEmitter: {
      on(event: string, cb: (...args: unknown[]) => void): void
      off(event: string, cb: (...args: unknown[]) => void): void
    }
    play(): Promise<unknown>
    stop(): Promise<unknown>
    destroy(): Promise<unknown> | undefined
    resize(width: number | string, height: number | string): void
    fullscreen(): void
  }
}
