import { AimOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { Button, InputNumber, Modal, Select, Space, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { CircleMarker, useMap } from 'react-leaflet'
import { TdtMap } from './TdtMap'
import { isValidLngLat, type PlaceResult, searchPlace, useTdtBrowserKey } from './tianditu'

/** 表单值：[经度, 纬度]，未定位为 null */
export type LngLat = [number, number] | null

function FlyTo({ point }: { point: LngLat }) {
  const map = useMap()
  useEffect(() => {
    if (point) map.flyTo([point[1], point[0]], Math.max(map.getZoom(), 15), { duration: 0.6 })
  }, [point, map])
  return null
}

function PickerModal({
  open,
  value,
  onOk,
  onCancel,
}: {
  open: boolean
  value: LngLat
  onOk: (v: LngLat) => void
  onCancel: () => void
}) {
  const hasTdtKey = Boolean(useTdtBrowserKey())
  const [point, setPoint] = useState<LngLat>(value)
  const [results, setResults] = useState<PlaceResult[]>([])
  const [searching, setSearching] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (open) setPoint(value)
  }, [open, value])

  const search = (kw: string) => {
    window.clearTimeout(timer.current)
    if (!kw.trim()) return setResults([])
    timer.current = window.setTimeout(async () => {
      abort.current?.abort()
      abort.current = new AbortController()
      setSearching(true)
      try {
        setResults(await searchPlace(kw.trim(), abort.current.signal))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  return (
    <Modal
      open={open}
      title="地图选点"
      width={820}
      onCancel={onCancel}
      onOk={() => onOk(point)}
      okText="确定"
      destroyOnHidden
    >
      {hasTdtKey && (
        <Select
          showSearch
          className="mb-3 w-full"
          placeholder="搜索地名、地址"
          filterOption={false}
          onSearch={search}
          loading={searching}
          notFoundContent={searching ? '搜索中…' : null}
          options={results.map((r, i) => ({ value: i, label: `${r.name}${r.address ? `  ·  ${r.address}` : ''}` }))}
          onSelect={(i: number) => setPoint([results[i].longitude, results[i].latitude])}
        />
      )}
      <TdtMap
        height={420}
        center={point ? [point[1], point[0]] : undefined}
        zoom={point ? 15 : 4}
        onClick={(lng, lat) => setPoint([Number(lng.toFixed(6)), Number(lat.toFixed(6))])}
      >
        {point && (
          <CircleMarker
            center={[point[1], point[0]]}
            radius={9}
            pathOptions={{ color: '#0f766e', fillOpacity: 0.85 }}
          />
        )}
        <FlyTo point={point} />
      </TdtMap>
      <div className="mt-3 flex items-center gap-2">
        <Typography.Text type="secondary">点击地图落点，或直接输入：</Typography.Text>
        <LngLatInputs value={point} onChange={setPoint} />
        {point && (
          <Button type="link" onClick={() => setPoint(null)}>
            清除
          </Button>
        )}
      </div>
    </Modal>
  )
}

function LngLatInputs({ value, onChange }: { value: LngLat; onChange: (v: LngLat) => void }) {
  const [lng, setLng] = useState<number | null>(value?.[0] ?? null)
  const [lat, setLat] = useState<number | null>(value?.[1] ?? null)
  useEffect(() => {
    setLng(value?.[0] ?? null)
    setLat(value?.[1] ?? null)
  }, [value])
  const emit = (a: number | null, b: number | null) => {
    if (a == null && b == null) onChange(null)
    else if (isValidLngLat(a, b)) onChange([a as number, b as number])
  }
  return (
    <Space.Compact>
      <InputNumber
        placeholder="经度"
        min={-180}
        max={180}
        precision={6}
        className="w-36"
        value={lng}
        onChange={(v) => {
          setLng(v)
          emit(v, lat)
        }}
      />
      <InputNumber
        placeholder="纬度"
        min={-90}
        max={90}
        precision={6}
        className="w-36"
        value={lat}
        onChange={(v) => {
          setLat(v)
          emit(lng, v)
        }}
      />
    </Space.Compact>
  )
}

export interface LocationPickerProps {
  value?: LngLat
  onChange?: (v: LngLat) => void
}

/** 位置表单控件：手输经纬度 + 地图选点 (搜索 / 点击落点)；坐标为 WGS84，请勿粘贴高德 / 百度坐标 */
export function LocationPicker({ value = null, onChange }: LocationPickerProps) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <Space wrap>
        <LngLatInputs value={value} onChange={(v) => onChange?.(v)} />
        <Button icon={<AimOutlined />} onClick={() => setOpen(true)}>
          地图选点
        </Button>
      </Space>
      <div className="mt-1 text-fg-tertiary text-xs">
        <EnvironmentOutlined /> 坐标系 WGS84 (天地图)，请勿直接粘贴高德 / 百度坐标
      </div>
      <PickerModal
        open={open}
        value={value}
        onCancel={() => setOpen(false)}
        onOk={(v) => {
          onChange?.(v)
          setOpen(false)
        }}
      />
    </div>
  )
}

/** 表单值 ↔ 接口字段 */
export const toLngLat = (r: { longitude?: number | null; latitude?: number | null }): LngLat =>
  r.longitude != null && r.latitude != null ? [r.longitude, r.latitude] : null

export const fromLngLat = (v: LngLat | undefined) =>
  v ? { longitude: v[0], latitude: v[1] } : { longitude: undefined, latitude: undefined }
