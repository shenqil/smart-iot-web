/** 移动端公共组件入口。业务页面不直接依赖其他页面的 UI 实现。 */

export { mobileContainer, mobileDialog, mobileToast, showFailure } from './components/feedback'
export { Icon } from './components/Icon'
export { LocalErrorBoundary } from './components/LocalErrorBoundary'
export { MobileListView } from './components/MobileListView'
export { StatRing } from './components/metrics'
export { OfflineBanner } from './components/OfflineBanner'
export { Page } from './components/Page'
export {
  Card,
  DetailList,
  Empty,
  Failure,
  Loading,
  Notice,
  Pagination,
  SectionHeading,
  StatusTag,
} from './components/primitives'
export { Choice, Sheet } from './components/selection'
export { useVisible } from './hooks/useVisible'
