import { Spin } from 'antd'

export function FullPageSpinner() {
  return (
    <div className="flex h-full min-h-[50vh] flex-1 items-center justify-center">
      <Spin size="large" />
    </div>
  )
}
