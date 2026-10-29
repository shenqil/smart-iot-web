import { relayKind, sensorKind } from './channelKind'

describe('sensorKind', () => {
  it('按标准名匹配，土壤湿度优先于湿度', () => {
    expect(sensorKind({ standardName: '空气温度' })).toBe('temperature')
    expect(sensorKind({ standardName: '土壤温度' })).toBe('temperature')
    expect(sensorKind({ standardName: '空气湿度' })).toBe('humidity')
    expect(sensorKind({ standardName: '土壤湿度' })).toBe('soilMoisture')
    expect(sensorKind({ standardName: '土壤EC' })).toBe('conductivity')
    expect(sensorKind({ standardName: '土壤pH' })).toBe('ph')
    expect(sensorKind({ standardName: 'CO₂浓度' })).toBe('co2')
    expect(sensorKind({ standardName: '光照强度' })).toBe('light')
  })

  it('标准名为空时用显示名，再用单位', () => {
    expect(sensorKind({ label: '1 号棚风速' })).toBe('wind')
    expect(sensorKind({ label: '读数 A', unit: '℃' })).toBe('temperature')
    expect(sensorKind({ unit: 'hPa' })).toBe('pressure')
    expect(sensorKind({ label: '通道 9' })).toBe('generic')
  })
})

describe('relayKind', () => {
  it('按名称匹配', () => {
    expect(relayKind({ standardName: '灌溉主阀' })).toBe('valve')
    expect(relayKind({ standardName: '卷膜机' })).toBe('roller')
    expect(relayKind({ standardName: '补光灯' })).toBe('light')
    expect(relayKind({ standardName: '风机' })).toBe('fan')
    expect(relayKind({ standardName: '水泵' })).toBe('pump')
    expect(relayKind({ label: '东区喷淋' })).toBe('sprinkler')
    expect(relayKind({ label: '备用' })).toBe('power')
  })
})
