import {
  areasFromSnapshot,
  changedPositions,
  geofenceSignature,
  normalizeAreas,
  openRing,
  parseGeofences,
  withGeofences,
} from './model'

const ring: [number, number][] = [
  [120.1, 30.2],
  [120.2, 30.2],
  [120.2, 30.3],
]

describe('parseGeofences', () => {
  it('读出闭合环并去掉重复的首尾', () => {
    const areas = parseGeofences({
      geofences: { version: 1, areas: [{ id: 'a', name: '一号地', ring: [...ring, ring[0]] }] },
    })
    expect(areas).toEqual([{ id: 'a', name: '一号地', ring }])
  })

  it('丢掉不完整的区域，保留其他键不受影响的读取', () => {
    expect(
      parseGeofences({
        note: '保留',
        geofences: {
          areas: [
            { id: 'bad', name: '两点', ring: [ring[0], ring[1]] },
            { id: '', name: '无编号', ring },
            { name: '无编号', ring },
            { id: 'ok', ring },
          ],
        },
      }),
    ).toEqual([{ id: 'ok', name: '区域 1', ring }])
  })

  it('properties 不是对象时当没有围栏', () => {
    expect(parseGeofences(null)).toEqual([])
    expect(parseGeofences([])).toEqual([])
    expect(parseGeofences({ geofences: [] })).toEqual([])
  })
})

describe('withGeofences', () => {
  it('整包替换时保留原有键', () => {
    const areas = [{ id: 'a', name: '一号地', ring }]
    expect(withGeofences({ note: '保留', geofences: { version: 0 } }, areas)).toEqual({
      note: '保留',
      geofences: { version: 1, areas },
    })
  })
})

describe('areasFromSnapshot', () => {
  it('只收多边形和矩形，并按 id 保留名称', () => {
    const names = new Map([['a', '一号地']])
    expect(
      areasFromSnapshot(
        [
          {
            id: 'a',
            properties: { mode: 'polygon' },
            geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] },
          },
          {
            id: 'b',
            properties: { mode: 'rectangle' },
            geometry: { type: 'Polygon', coordinates: [[ring[0], ring[1], ring[2], ring[0]]] },
          },
          { id: 'c', properties: { mode: 'select' }, geometry: { type: 'Point', coordinates: ring[0] } },
          {
            id: 'd',
            properties: { mode: 'polygon' },
            geometry: { type: 'Polygon', coordinates: [[ring[0], ring[1]]] },
          },
        ],
        names,
      ),
    ).toEqual([
      { id: 'a', name: '一号地', ring },
      { id: 'b', name: '区域 1', ring },
    ])
  })
})

describe('normalizeAreas', () => {
  it('空白名称补成区域编号', () => {
    expect(normalizeAreas([{ id: 'a', name: '  ', ring }])[0]?.name).toBe('区域 1')
  })

  it('签名把首尾空格当成同一份草稿', () => {
    const a = [{ id: 'a', name: '一号地', ring }]
    const b = [{ id: 'a', name: '一号地 ', ring }]
    expect(geofenceSignature(a)).toBe(geofenceSignature(b))
  })
})

describe('openRing', () => {
  it('坐标超出范围时整环作废', () => {
    expect(openRing([...ring, [200, 30]])).toBeNull()
  })
})

describe('changedPositions', () => {
  it('只列出已经落点并且坐标变了的设备', () => {
    const originals = new Map<number, [number, number] | null>([
      [1, [120, 30]],
      [2, null],
      [3, [121, 31]],
    ])
    const drafts = new Map<number, [number, number] | null>([
      [1, [120.1, 30]],
      [2, [120, 30]],
      [3, [121, 31]],
      [4, null],
    ])
    expect(changedPositions(originals, drafts)).toEqual([
      { id: 1, longitude: 120.1, latitude: 30 },
      { id: 2, longitude: 120, latitude: 30 },
    ])
  })
})
