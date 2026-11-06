import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LocalErrorBoundary } from './LocalErrorBoundary'

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Explosion in sub-component')
  }
  return <div>Component Works Normal</div>
}

describe('LocalErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <LocalErrorBoundary>
        <Bomb shouldThrow={false} />
      </LocalErrorBoundary>,
    )
    expect(screen.getByText('Component Works Normal')).toBeInTheDocument()
  })

  it('catches error and displays fallback UI without crashing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onCatch = vi.fn()

    render(
      <LocalErrorBoundary fallbackTitle="图表渲染失败" onCatch={onCatch}>
        <Bomb shouldThrow={true} />
      </LocalErrorBoundary>,
    )

    expect(screen.queryByText('Component Works Normal')).not.toBeInTheDocument()
    expect(screen.getByText('图表渲染失败')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
    expect(onCatch).toHaveBeenCalledTimes(1)

    spy.mockRestore()
  })

  it('allows retrying after error state is caught', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let fail = true

    function DynamicBomb() {
      if (fail) throw new Error('First try failed')
      return <div>Recovered Successfully</div>
    }

    render(
      <LocalErrorBoundary>
        <DynamicBomb />
      </LocalErrorBoundary>,
    )

    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()

    fail = false
    fireEvent.click(screen.getByRole('button', { name: '重试' }))

    expect(screen.getByText('Recovered Successfully')).toBeInTheDocument()

    spy.mockRestore()
  })
})
