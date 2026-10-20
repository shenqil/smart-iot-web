/**
 * LTTB 降采样 (Largest-Triangle-Three-Buckets)：在保留形状的前提下把折线点数降到 threshold
 * xs / ys 为等长数组 (xs 升序)；只取 [from, to) 下标区间；ys 中的 NaN (无读数) 跳过
 * 返回交错数组 [x0, y0, x1, y1, ...]
 */
export function lttb(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  threshold: number,
  from = 0,
  to = xs.length,
): Float64Array {
  // 先收集有效点的下标
  const idx: number[] = []
  for (let i = from; i < to; i++) if (!Number.isNaN(ys[i])) idx.push(i)
  const n = idx.length
  if (threshold >= n || threshold < 3) {
    const out = new Float64Array(n * 2)
    for (let k = 0; k < n; k++) {
      out[k * 2] = xs[idx[k]]
      out[k * 2 + 1] = ys[idx[k]]
    }
    return out
  }

  const out = new Float64Array(threshold * 2)
  let o = 0
  const push = (i: number) => {
    out[o++] = xs[i]
    out[o++] = ys[i]
  }
  const every = (n - 2) / (threshold - 2)
  let a = 0 // 上一个选中点 (idx 中的位置)
  push(idx[0])
  for (let b = 0; b < threshold - 2; b++) {
    // 下一个桶的平均点
    const nextStart = Math.floor((b + 1) * every) + 1
    const nextEnd = Math.min(Math.floor((b + 2) * every) + 1, n)
    let avgX = 0
    let avgY = 0
    for (let k = nextStart; k < nextEnd; k++) {
      avgX += xs[idx[k]]
      avgY += ys[idx[k]]
    }
    const len = nextEnd - nextStart || 1
    avgX /= len
    avgY /= len
    // 当前桶内与 (上一个选中点, 下一个桶平均点) 构成最大三角形的点
    const start = Math.floor(b * every) + 1
    const end = Math.floor((b + 1) * every) + 1
    const ax = xs[idx[a]]
    const ay = ys[idx[a]]
    let maxArea = -1
    let pick = start
    for (let k = start; k < end; k++) {
      const area = Math.abs((ax - avgX) * (ys[idx[k]] - ay) - (ax - xs[idx[k]]) * (avgY - ay))
      if (area > maxArea) {
        maxArea = area
        pick = k
      }
    }
    push(idx[pick])
    a = pick
  }
  push(idx[n - 1])
  return out
}

/** 二分查找：第一个 >= x 的下标 (xs 升序) */
export function lowerBound(xs: ArrayLike<number>, x: number): number {
  let lo = 0
  let hi = xs.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (xs[mid] < x) lo = mid + 1
    else hi = mid
  }
  return lo
}
