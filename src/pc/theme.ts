import { type ThemeConfig, theme } from 'antd'

const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', Roboto, sans-serif"

/** 管理端 / 数据端：亮色 */
export const lightTheme: ThemeConfig = {
  cssVar: { key: 'siot' },
  token: {
    colorPrimary: '#0f766e',
    colorInfo: '#0f766e',
    // 深色主色按算法生成的浅色背景偏灰，手动指定
    colorPrimaryBg: '#e8f5f2',
    colorPrimaryBgHover: '#d3ece6',
    colorPrimaryBorder: '#a9d9cf',
    colorPrimaryBorderHover: '#7fc5b7',
    colorInfoBg: '#e8f5f2',
    colorInfoBorder: '#a9d9cf',
    borderRadius: 6,
    fontFamily,
  },
  components: {
    Layout: { headerBg: '#ffffff', headerHeight: 56, headerPadding: '0 16px', siderBg: '#ffffff' },
    Menu: { itemBorderRadius: 6 },
  },
}

/**
 * 大屏：暗色
 * 下拉选中项不用主色实底 (亮青底 + 白字看不清)，改为低透明度青色底 + 青色文字；弹层用深蓝底，与卡片一致
 */
export const screenTheme: ThemeConfig = {
  cssVar: { key: 'siot-screen' },
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#22d3ee',
    colorBgBase: '#06121f',
    colorBgContainer: '#071a2b',
    colorBgElevated: '#0b1f33',
    colorBorder: 'rgba(34, 211, 238, 0.28)',
    colorText: '#e6f1f8',
    colorTextPlaceholder: '#7f9bb3',
    fontFamily,
  },
  components: {
    Select: {
      selectorBg: 'rgba(5, 19, 33, 0.88)',
      optionSelectedBg: 'rgba(34, 211, 238, 0.14)',
      optionSelectedColor: '#67e8f9',
      optionSelectedFontWeight: 600,
      optionActiveBg: 'rgba(148, 163, 184, 0.12)',
      hoverBorderColor: 'rgba(34, 211, 238, 0.6)',
      activeBorderColor: '#22d3ee',
      activeOutlineColor: 'rgba(34, 211, 238, 0.15)',
    },
    Button: { primaryColor: '#04101c', primaryShadow: 'none' },
    Modal: { contentBg: '#0b1f33', headerBg: '#0b1f33' },
    Message: { contentBg: '#0b1f33' },
  },
}
