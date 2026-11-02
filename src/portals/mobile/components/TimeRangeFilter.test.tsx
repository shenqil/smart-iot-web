import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mobileToast } from './feedback'
import { TimeFilter, validateRecordRange } from './TimeRangeFilter'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})
describe('记录时间范围', () => {
  it('拒绝半个范围、日期溢出、已过保留期和未来时间', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-02T02:00:00Z'))
    expect(validateRecordRange('', '')).toBe('')
    expect(validateRecordRange('2026-11-01T10:00', '')).toContain('完整')
    expect(validateRecordRange('2026-10-32T10:00', '2026-11-02T10:00')).toContain('有效')
    expect(validateRecordRange('2026-09-30T10:00', '2026-10-01T10:00')).toContain('保留')
    expect(validateRecordRange('2026-11-02T09:00', '2026-11-02T10:01')).toContain('当前')
    expect(validateRecordRange('2026-10-01T00:00', '2026-11-02T10:00')).toBe('')
  })
  it('只有应用才提交业务时区；URL 清除同步清空本地输入', () => {
    const apply = vi.fn()
    vi.spyOn(mobileToast, 'show').mockImplementation(() => ({ close: () => {} }))
    const { rerender } = render(
      <TimeFilter start="2026-11-01T01:00:00+08:00" end="2026-11-01T02:00:00+08:00" apply={apply} />,
    )
    expect(screen.getByLabelText('开始时间')).toHaveValue('2026-11-01T01:00')
    fireEvent.change(screen.getByLabelText('开始时间'), { target: { value: '2026-11-01T00:00' } })
    expect(apply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '应用时间' }))
    expect(apply).toHaveBeenCalledWith('2026-11-01T00:00:00+08:00', '2026-11-01T02:00:00+08:00')
    rerender(<TimeFilter apply={apply} />)
    expect(screen.getByLabelText('开始时间')).toHaveValue('')
  })
})
