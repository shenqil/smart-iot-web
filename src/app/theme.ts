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

/** 大屏：暗色 */
export const screenTheme: ThemeConfig = {
  cssVar: { key: 'siot-screen' },
  algorithm: theme.darkAlgorithm,
  token: { colorPrimary: '#2dd4bf', colorBgBase: '#06121f', fontFamily },
}
