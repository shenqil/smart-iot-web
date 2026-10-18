import { queryOptions, useQuery } from '@tanstack/react-query'
import { api, type Schemas, unwrap } from '@/api/client'
import { fetchAllPages } from '@/api/page'

export type DeviceType = Schemas['DeviceTypeView']
export type StandardSensor = Schemas['StandardSensorView']
export type StandardRelay = Schemas['StandardRelayView']

const all = <T>(
  path: '/api/v1/common/device-types' | '/api/v1/common/standard-sensors' | '/api/v1/common/standard-relays',
) =>
  fetchAllPages<T>(
    (page, pageSize) => unwrap(api.GET(path, { params: { query: { page, pageSize, sort: 'sort' } } })) as never,
  )

/** 字典全量 (只读接口，任意登录用户)，缓存 10 分钟；字典页增删改后失效 ['dict'] */
export const dictQueries = {
  deviceTypes: queryOptions({
    queryKey: ['dict', 'device-types'],
    queryFn: () => all<DeviceType>('/api/v1/common/device-types'),
    staleTime: 10 * 60_000,
  }),
  sensors: queryOptions({
    queryKey: ['dict', 'standard-sensors'],
    queryFn: () => all<StandardSensor>('/api/v1/common/standard-sensors'),
    staleTime: 10 * 60_000,
  }),
  relays: queryOptions({
    queryKey: ['dict', 'standard-relays'],
    queryFn: () => all<StandardRelay>('/api/v1/common/standard-relays'),
    staleTime: 10 * 60_000,
  }),
}

/** 设备类型：列表与 id → 名称映射 */
export function useDeviceTypes() {
  const { data = [] } = useQuery(dictQueries.deviceTypes)
  const byId = new Map(data.map((t) => [t.id, t]))
  return {
    list: data,
    byId,
    options: data.map((t) => ({ value: t.id, label: t.name })),
    nameOf: (id: number | null | undefined) => (id == null ? '未分类' : (byId.get(id)?.name ?? `类型 ${id}`)),
  }
}

export function useStandardSensors() {
  const { data = [] } = useQuery(dictQueries.sensors)
  return { list: data, byId: new Map(data.map((s) => [s.id, s])) }
}

export function useStandardRelays() {
  const { data = [] } = useQuery(dictQueries.relays)
  return { list: data, byId: new Map(data.map((s) => [s.id, s])) }
}
