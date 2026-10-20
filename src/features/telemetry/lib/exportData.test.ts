import { strFromU8, unzipSync } from 'fflate'
import {
  cachedOffset,
  dataSheets,
  excelSerial,
  exportChannels,
  recordRow,
  roundTo,
  type SensorConfig,
} from './exportData'
import { buildXlsx, columnLetter, escapeXml } from './xlsx'

const sensors: SensorConfig[] = [
  { channelNum: 0, displayName: '1号棚温度', standardName: '空气温度', unit: '℃', resolution: 0.1 },
  { channelNum: 1, standardName: '空气湿度', unit: '%RH', resolution: 0.01 },
  { channelNum: 2, displayName: '', standardName: '', unit: '' },
  { channelNum: 5, standardName: '空气湿度', unit: '%RH', resolution: 1 },
]

describe('exportChannels', () => {
  it('按选择顺序生成表头：名称（单位）', () => {
    const cols = exportChannels(sensors, [1, 0, 2])
    expect(cols.map((c) => c.header)).toEqual(['空气湿度（%RH）', '1号棚温度（℃）', '通道 2'])
    expect(cols.map((c) => c.decimals)).toEqual([2, 1, 2])
  })
  it('同名表头追加通道号，未配置的通道忽略', () => {
    const cols = exportChannels(sensors, [1, 5, 9])
    expect(cols.map((c) => c.header)).toEqual(['空气湿度（%RH） #1', '空气湿度（%RH） #5'])
  })
})

describe('数值与时间', () => {
  it('Excel 序列值按业务时区落位', () => {
    // 2026-10-18 00:00:00 +08:00 = 2026-10-17T16:00:00Z
    const ms = Date.UTC(2026, 9, 17, 16, 0, 0)
    expect(excelSerial(ms, 480)).toBe(46313) // Excel 中 2026-10-18 的序列值
  })
  it('四舍五入去掉浮点尾数', () => {
    expect(roundTo(25.299999999, 1)).toBe(25.3)
    expect(roundTo(7.6, 0)).toBe(8)
  })
  it('无读数与缺失通道为空单元格', () => {
    const cols = exportChannels(sensors, [0, 1, 5])
    const row = recordRow({ time: 0, vals: [21.26, 2147483647] }, cols, 0)
    expect(row).toEqual([25569, 21.3, null, null])
  })
  it('时区偏移按小时缓存', () => {
    let calls = 0
    const f = cachedOffset(() => {
      calls++
      return 480
    })
    f(1000)
    f(2000)
    f(3_600_000 + 1)
    expect(calls).toBe(2)
  })
})

describe('xlsx', () => {
  it('列字母', () => {
    expect([0, 25, 26, 701, 702].map(columnLetter)).toEqual(['A', 'Z', 'AA', 'ZZ', 'AAA'])
  })
  it('转义 XML 并去掉控制字符', () => {
    expect(escapeXml('a<b>&"\u0001')).toBe('a&lt;b&gt;&amp;&quot;')
  })
  it('超过单表行数时拆分工作表，且可解压为合法结构', async () => {
    const cols = exportChannels(sensors, [0, 1])
    const records = Array.from({ length: 5 }, (_, i) => ({ time: i * 60_000, vals: [20 + i, 50] }))
    const sheets = dataSheets(records, cols, () => 480, 2)
    expect(sheets.map((s) => s.name)).toEqual(['数据 1', '数据 2', '数据 3'])

    let rows = 0
    const blob = await buildXlsx(sheets, () => rows++)
    expect(rows).toBe(5)
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()))
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining(['[Content_Types].xml', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet3.xml']),
    )
    const s1 = strFromU8(files['xl/worksheets/sheet1.xml'])
    expect(s1).toContain('<t xml:space="preserve">时间</t>')
    expect(s1).toContain('1号棚温度（℃）')
    expect(s1.match(/<row /g)?.length).toBe(3) // 表头 + 2 行
    expect(strFromU8(files['xl/worksheets/sheet3.xml']).match(/<row /g)?.length).toBe(2) // 表头 + 1 行
  })
})
