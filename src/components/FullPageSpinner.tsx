import { Spin } from 'antd'

export function FullPageSpinner() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center">
      <Spin size="large" />
    </div>
  )
}
