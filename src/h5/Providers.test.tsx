import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { notify } from '@/shared/notify'
import MobileProviders from './Providers'

afterEach(cleanup)
describe('React 19 移动反馈', () => {
  it('命令式确认框可渲染并执行动作', async () => {
    render(
      <MobileProviders>
        <span>移动入口</span>
      </MobileProviders>,
    )
    const onOk = vi.fn()
    act(() => {
      notify.modal().confirm({ title: '测试确认', okText: '继续', onOk })
    })
    fireEvent.click(await screen.findByText('继续'))
    await waitFor(() => expect(onOk).toHaveBeenCalledOnce())
    expect(document.querySelector('.ant-modal')).toBeNull()
  })
})
