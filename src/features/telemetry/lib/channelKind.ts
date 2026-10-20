/**
 * 通道的视觉类别：决定卡片的内置图标与主题色
 * - 字典 / 通道配置上传了图标时优先使用上传的图标，类别只提供主题色
 * - 按 标准名 › 显示名 › 单位 依次匹配关键字，都不匹配时为 generic
 */

export type SensorKind =
  | 'temperature'
  | 'humidity'
  | 'soilMoisture'
  | 'light'
  | 'co2'
  | 'conductivity'
  | 'ph'
  | 'wind'
  | 'rain'
  | 'pressure'
  | 'nutrient'
  | 'particulate'
  | 'level'
  | 'electric'
  | 'generic'

export type RelayKind =
  | 'valve'
  | 'sprinkler'
  | 'light'
  | 'fan'
  | 'pump'
  | 'roller'
  | 'heater'
  | 'door'
  | 'alarm'
  | 'power'

/** 主题色：亮色背景上对比度足够，与主色 (青绿) 区分开 */
export const SENSOR_TONE: Record<SensorKind, string> = {
  temperature: '#e8590c',
  humidity: '#1c7ed6',
  soilMoisture: '#0c8599',
  light: '#d98a00',
  co2: '#4263eb',
  conductivity: '#7048e8',
  ph: '#c2255c',
  wind: '#0b7285',
  rain: '#1971c2',
  pressure: '#5c7cfa',
  nutrient: '#2f9e44',
  particulate: '#868e96',
  level: '#1098ad',
  electric: '#e67700',
  generic: 'var(--ant-color-primary)',
}

const SENSOR_RULES: [SensorKind, RegExp][] = [
  ['soilMoisture', /土壤.*(湿|水)|含水|墒情/],
  ['temperature', /温度|气温|水温|地温|温/],
  ['humidity', /湿度|湿/],
  ['light', /光照|光强|照度|辐射|紫外|光/],
  ['co2', /co[2₂]|二氧化碳|氨气|nh3|甲烷|气体/i],
  ['conductivity', /ec|电导|盐分/i],
  ['ph', /ph|酸碱/i],
  ['wind', /风速|风向|风/],
  ['rain', /雨|降水|降雨/],
  ['pressure', /气压|压力|大气压/],
  ['nutrient', /氮|磷|钾|npk|养分|肥/i],
  ['particulate', /pm\s*(2\.5|10)|颗粒|粉尘|tsp/i],
  ['level', /液位|水位|水深/],
  ['electric', /电压|电流|功率|电量|电能/],
]

const UNIT_RULES: [SensorKind, RegExp][] = [
  ['temperature', /^(℃|°c|°f|℉)$/i],
  ['humidity', /^%rh$/i],
  ['light', /^(lux|lx|klux|w\/m²|w\/m2)$/i],
  ['co2', /^ppm$/i],
  ['conductivity', /^(ms\/cm|μs\/cm|us\/cm|ds\/m)$/i],
  ['ph', /^ph$/i],
  ['wind', /^(m\/s|km\/h)$/i],
  ['rain', /^mm$/i],
  ['pressure', /^(hpa|kpa|mpa|pa|bar)$/i],
  ['nutrient', /^mg\/kg$/i],
  ['particulate', /^(μg\/m³|ug\/m3|μg\/m3)$/i],
  ['electric', /^(v|a|w|kw|kwh)$/i],
]

export function sensorKind(c: { standardName?: string; displayName?: string; unit?: string }): SensorKind {
  for (const text of [c.standardName, c.displayName]) {
    const t = text?.trim()
    if (!t) continue
    for (const [kind, re] of SENSOR_RULES) if (re.test(t)) return kind
  }
  const u = c.unit?.trim()
  if (u) for (const [kind, re] of UNIT_RULES) if (re.test(u)) return kind
  return 'generic'
}

const RELAY_RULES: [RelayKind, RegExp][] = [
  ['sprinkler', /喷淋|喷灌|喷雾|雾化|滴灌|微喷/],
  ['valve', /阀|灌溉/],
  ['light', /灯|照明|补光/],
  ['fan', /风机|风扇|排风|通风|新风|湿帘/],
  ['pump', /泵|抽水|增压/],
  ['roller', /卷膜|卷帘|遮阳|内遮|外遮|天窗|侧窗|卷/],
  ['heater', /加热|加温|暖|锅炉/],
  ['door', /门|窗/],
  ['alarm', /报警|警示|声光|蜂鸣/],
]

export function relayKind(c: { standardName?: string; displayName?: string }): RelayKind {
  for (const text of [c.standardName, c.displayName]) {
    const t = text?.trim()
    if (!t) continue
    for (const [kind, re] of RELAY_RULES) if (re.test(t)) return kind
  }
  return 'power'
}
