import { describe, expect, it, vi } from 'vitest'
import { bindNotify, type NotifyAdapter, notify } from './notify'

const target = (): NotifyAdapter => ({
  success: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  modal: { confirm: vi.fn(), warning: vi.fn() },
})
describe('反馈端适配', () => {
  it('旧端清理不能取消新端绑定，卸载期间的错误不会丢失', () => {
    const pc = target(),
      mobile = target()
    const leavePC = bindNotify(pc)
    notify.info('PC')
    expect(pc.info).toHaveBeenCalledWith('PC')
    const leaveMobile = bindNotify(mobile)
    leavePC()
    notify.error('移动错误')
    expect(mobile.error).toHaveBeenCalledWith('移动错误')
    leaveMobile()
    notify.modal().warning({ title: '企业失权' })
    const next = target(),
      cleanup = bindNotify(next)
    expect(next.modal.warning).toHaveBeenCalledWith({ title: '企业失权' })
    cleanup()
  })
})
