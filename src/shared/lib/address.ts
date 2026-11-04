/** 省 / 市 / 区 / 详细地址拼成一行 (直辖市省市同名时只显示一次) */
export function joinAddress(r: {
  province?: string | null
  city?: string | null
  district?: string | null
  address?: string | null
}): string {
  const parts = [r.province, r.city, r.district].filter((v): v is string => Boolean(v))
  const region = parts.filter((v, i) => v !== parts[i - 1]).join(' ')
  const addr = r.address?.trim() ?? ''
  // 详细地址已包含行政区 (逆地理编码的完整地址) 时不再重复
  if (addr && region && addr.startsWith(parts.join(''))) return addr
  return [region, addr].filter(Boolean).join(' ')
}
