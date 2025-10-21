export interface LoopInfo {
  start: number
  period: number
  confidence: number
}

export interface DetectLoopOptions {
  minPeriod?: number // 最小周期（采样域），默认基于帧数推断，至少 12
  maxPeriod?: number // 最大周期（采样域），默认 M/2
  sampleLimit?: number // 构建矩阵的最大采样帧数，默认 120
  smoothWindow?: number // 特征时序平滑半径，默认 1（即窗口=3）
}

// 提取图像特征（灰度直方图）
export const extractImageFeature = (imageData: ImageData): number[] => {
  const data = imageData.data
  const histogram = new Array(256).fill(0)

  // 计算灰度直方图
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.floor(
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    )
    histogram[gray]++
  }

  // 归一化
  const total = imageData.width * imageData.height
  return histogram.map((v) => v / total)
}

// 计算两个特征向量的距离
export const featureDistance = (f1: number[], f2: number[]): number => {
  let sum = 0
  for (let i = 0; i < f1.length; i++) {
    sum += Math.abs(f1[i] - f2[i])
  }
  return sum
}

// 基于图像相似度查找循环周期
export const findLoopPeriodByImageSimilarity = (
  features: number[][]
): LoopInfo => {
  const N = features.length
  let bestL = 0
  let bestCost = Infinity
  let bestStart = 0

  // 尝试不同的起点和周期
  for (let start = 0; start < Math.min(N / 3, 5); start++) {
    // 设定最小周期，避免过短周期（如 3 帧）导致输出过少
    const minPeriod = Math.max(6, Math.floor(N * 0.1))
    for (let L = minPeriod; L <= Math.floor((N - start) / 2); L++) {
      if (start + L >= N) break

      let cost = 0
      let count = 0

      // 计算周期内的平均差异
      for (let i = start; i + L < N && count < 10; i++) {
        cost += featureDistance(features[i], features[i + L])
        count++
      }

      if (count > 0) {
        cost = cost / count

        if (cost < bestCost) {
          bestCost = cost
          bestL = L
          bestStart = start
        }
      }
    }
  }

  return {
    start: bestStart,
    period: bestL || Math.max(Math.max(6, Math.floor(N * 0.1)), Math.floor(N / 2)),
    confidence: 1 / (1 + bestCost * 100),
  }
}

// 检测循环帧
export const detectLoopFrames = async (
  frames: Array<{ url: string }>,
  options: DetectLoopOptions = {}
): Promise<LoopInfo> => {
  // 边界情况处理
  const total = frames.length
  if (total <= 2) {
    return { start: 0, period: Math.max(1, total - 1), confidence: 0.2 }
  }

  // 下采样限制，避免 O(N^2) 过大：最多取 120 帧构建相似度矩阵
  const maxSample = Math.max(60, options.sampleLimit ?? 120)
  const sampleStep = Math.max(1, Math.floor(total / maxSample))
  const sampleIndices: number[] = []
  for (let i = 0; i < total; i += sampleStep) sampleIndices.push(i)
  if (sampleIndices[sampleIndices.length - 1] !== total - 1) {
    sampleIndices.push(total - 1)
  }

  // 多特征定义：低分辨率图块 + 梯度直方图 + aHash
  type MultiFeature = {
    lowRes: Float32Array // 16x16 = 256 维，均值方差归一化
    gradHist: Float32Array // 8 维方向直方图，归一化
    aHash: bigint // 64bit 感知哈希
  }

  // 低分辨率图块特征（从 32x32 灰度图下采样到 16x16 并进行均值方差归一化）
  const extractLowResPatch = (img32: ImageData): Float32Array => {
    const w = 32
    const target = 16
    const out = new Float32Array(target * target)
    const data = img32.data
    let idx = 0
    for (let ty = 0; ty < target; ty++) {
      for (let tx = 0; tx < target; tx++) {
        // 2x2 平均池化
        const x0 = tx * 2
        const y0 = ty * 2
        let sum = 0
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const x = x0 + dx
            const y = y0 + dy
            const off = (y * w + x) * 4
            const r = data[off]
            const g = data[off + 1]
            const b = data[off + 2]
            const gray = 0.299 * r + 0.587 * g + 0.114 * b
            sum += gray
          }
        }
        out[idx++] = sum / 4
      }
    }
    // 均值方差归一化
    let mean = 0
    for (let i = 0; i < out.length; i++) mean += out[i]
    mean /= out.length
    let varSum = 0
    for (let i = 0; i < out.length; i++) {
      const d = out[i] - mean
      varSum += d * d
    }
    const std = Math.sqrt(varSum / out.length) || 1
    for (let i = 0; i < out.length; i++) out[i] = (out[i] - mean) / std
    return out
  }

  // 梯度方向直方图（Sobel + 8-bin 方向直方图），对幅值做权重
  const extractGradHist = (img32: ImageData): Float32Array => {
    const w = 32, h = 32
    const data = img32.data
    const hist = new Float32Array(8)
    const getGray = (x: number, y: number): number => {
      const off = (y * w + x) * 4
      return 0.299 * data[off] + 0.587 * data[off + 1] + 0.114 * data[off + 2]
    }
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const gx = -getGray(x - 1, y - 1) - 2 * getGray(x - 1, y) - getGray(x - 1, y + 1)
          + getGray(x + 1, y - 1) + 2 * getGray(x + 1, y) + getGray(x + 1, y + 1)
        const gy = -getGray(x - 1, y - 1) - 2 * getGray(x, y - 1) - getGray(x + 1, y - 1)
          + getGray(x - 1, y + 1) + 2 * getGray(x, y + 1) + getGray(x + 1, y + 1)
        const mag = Math.hypot(gx, gy)
        let angle = Math.atan2(gy, gx) // [-PI, PI]
        if (angle < 0) angle += Math.PI // [0, PI] 无方向
        const bin = Math.min(7, Math.floor((angle / Math.PI) * 8))
        hist[bin] += mag
      }
    }
    // 归一化
    let sum = 0
    for (let i = 0; i < hist.length; i++) sum += hist[i]
    if (sum > 0) {
      for (let i = 0; i < hist.length; i++) hist[i] /= sum
    }
    return hist
  }

  // aHash（8x8 灰度平均哈希）
  const extractAHash = (img8: ImageData): bigint => {
    const data = img8.data
    const w = 8, h = 8
    const grays = new Float32Array(w * h)
    let mean = 0
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      grays[j] = gray
      mean += gray
    }
    mean /= grays.length
    let bits = 0n
    for (let i = 0; i < grays.length; i++) {
      bits <<= 1n
      if (grays[i] >= mean) bits |= 1n
    }
    return bits
  }

  const hammingDistance = (a: bigint, b: bigint): number => {
    let x = a ^ b
    let count = 0
    while (x) {
      x &= x - 1n
      count++
    }
    return count
  }

  // 组合距离：低分辨率 L1 + aHash 汉明/64 + 梯度直方图 L1
  const combinedDistance = (f1: MultiFeature, f2: MultiFeature): number => {
    let l1 = 0
    for (let i = 0; i < f1.lowRes.length; i++) l1 += Math.abs(f1.lowRes[i] - f2.lowRes[i])
    let gh = 0
    for (let i = 0; i < f1.gradHist.length; i++) gh += Math.abs(f1.gradHist[i] - f2.gradHist[i])
    const ah = hammingDistance(f1.aHash, f2.aHash) / 64
    // 权重可微调：低频外形更重要
    return 0.6 * (l1 / f1.lowRes.length) + 0.2 * ah + 0.2 * (gh / 2) // gradHist L1 上界约为2
  }

  // 读取采样帧并生成多特征
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const features: MultiFeature[] = []

  for (let k = 0; k < sampleIndices.length; k++) {
    const idx = sampleIndices[k]
    const img = new Image()
    img.src = frames[idx].url
    await new Promise((resolve) => (img.onload = resolve))

    // 32x32 用于低分辨率特征与梯度直方图
    canvas.width = 32
    canvas.height = 32
    ctx.drawImage(img, 0, 0, 32, 32)
    const img32 = ctx.getImageData(0, 0, 32, 32)

    // 8x8 用于 aHash
    canvas.width = 8
    canvas.height = 8
    ctx.drawImage(img, 0, 0, 8, 8)
    const img8 = ctx.getImageData(0, 0, 8, 8)

    features.push({
      lowRes: extractLowResPatch(img32),
      gradHist: extractGradHist(img32),
      aHash: extractAHash(img8)
    })
  }

  const M = features.length
  if (M < 4) {
    // 特征不足，回退简单策略
    return { start: 0, period: Math.max(2, Math.floor(total / 2)), confidence: 0.3 }
  }

  // 时序平滑（低分与梯度）：窗口 = 2 * smoothWindow + 1
  const smoothWindow = Math.max(0, Math.min(3, options.smoothWindow ?? 1))
  if (smoothWindow > 0) {
    const tmpLow = features.map(f => f.lowRes)
    const tmpGrad = features.map(f => f.gradHist)
    const lowLen = tmpLow[0].length
    const gradLen = tmpGrad[0].length
    for (let i = 0; i < M; i++) {
      const low = new Float32Array(lowLen)
      const gh = new Float32Array(gradLen)
      let denom = 0
      for (let d = -smoothWindow; d <= smoothWindow; d++) {
        const j = i + d
        if (j < 0 || j >= M) continue
        const w = 1 // 均匀权重，简单且稳定
        denom += w
        for (let k = 0; k < lowLen; k++) low[k] += tmpLow[j][k] * w
        for (let k = 0; k < gradLen; k++) gh[k] += tmpGrad[j][k] * w
      }
      for (let k = 0; k < lowLen; k++) low[k] /= denom
      for (let k = 0; k < gradLen; k++) gh[k] /= denom
      features[i].lowRes = low
      features[i].gradHist = gh
    }
  }

  // 构建相似度矩阵（距离矩阵），用于自相关式评分
  const dist: number[][] = Array.from({ length: M }, () => new Array(M).fill(0))
  for (let i = 0; i < M; i++) {
    for (let j = i + 1; j < M; j++) {
      const d = combinedDistance(features[i], features[j])
      dist[i][j] = d
      dist[j][i] = d
    }
  }

  // 计算给定 L 的平均代价（允许 ±1 相位容错），并跨多重重复评估一致性
  const costFor = (L: number): number => {
    let cost = 0
    let count = 0
    for (let i = 0; i + L < M; i++) {
      // 第一重：i 与 i+L
      let best1 = dist[i][i + L]
      if (L > 1 && i + L - 1 < M) best1 = Math.min(best1, dist[i][i + L - 1])
      if (i + L + 1 < M) best1 = Math.min(best1, dist[i][i + L + 1])
      cost += best1
      count++

      // 第二重：若有 i+2L，与两周期之后比较
      if (i + 2 * L < M) {
        let best2 = dist[i][i + 2 * L]
        if (i + 2 * L - 1 < M) best2 = Math.min(best2, dist[i][i + 2 * L - 1])
        if (i + 2 * L + 1 < M) best2 = Math.min(best2, dist[i][i + 2 * L + 1])
        cost += best2
        count++
      }
    }
    if (count === 0) return Infinity
    const avg = cost / count
    // 对过短 L 增加轻微正则化惩罚，避免总是吸附在下界
    const shortPenalty = 0.02 * (1 / Math.max(1, L))
    return avg + shortPenalty
  }

  // 搜索周期范围：避免过短周期，且不超过一半
  // 最小周期与最大周期（采样域）可配置；默认至少 12，且 >= M*0.1
  const inferredMin = Math.max(12, Math.floor(M * 0.125))
  const minPeriodSample = Math.max(6, options.minPeriod ?? inferredMin)
  const maxPeriodSample = Math.max(minPeriodSample + 1, options.maxPeriod ?? Math.floor(M / 2))
  let bestL = minPeriodSample
  let bestCost = Infinity
  const allCosts: number[] = []
  for (let L = minPeriodSample; L <= maxPeriodSample; L++) {
    const c = costFor(L)
    allCosts.push(c)
    if (c < bestCost) {
      bestCost = c
      bestL = L
    }
  }

  // 基于最佳 L，估计起点：在 [0, L-1] 内搜索平均最小代价
  let bestStartSample = 0
  let bestStartCost = Infinity
  for (let s = 0; s < bestL; s++) {
    let cost = 0
    let count = 0
    for (let i = s; i + bestL < M; i++) {
      let d = dist[i][i + bestL]
      if (bestL > 1 && i + bestL - 1 < M) d = Math.min(d, dist[i][i + bestL - 1])
      if (i + bestL + 1 < M) d = Math.min(d, dist[i][i + bestL + 1])
      cost += d
      count++

      // 跨两周期一致性
      if (i + 2 * bestL < M) {
        let d2 = dist[i][i + 2 * bestL]
        if (i + 2 * bestL - 1 < M) d2 = Math.min(d2, dist[i][i + 2 * bestL - 1])
        if (i + 2 * bestL + 1 < M) d2 = Math.min(d2, dist[i][i + 2 * bestL + 1])
        cost += d2
        count++
      }
    }
    if (count > 0) {
      const avg = cost / count
      if (avg < bestStartCost) {
        bestStartCost = avg
        bestStartSample = s
      }
    }
  }

  // 置信度：相对其它 L 的改进比例 * 重复次数因子
  const median = (() => {
    const arr = [...allCosts].filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
    if (arr.length === 0) return bestCost
    const mid = Math.floor(arr.length / 2)
    return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid]
  })()
  const base = Math.max(1e-6, median)
  let confidence = Math.max(0, Math.min(1, (median - bestCost) / base))
  const repeats = Math.max(1, Math.floor(M / bestL))
  confidence = Math.min(1, confidence * Math.min(1, repeats / 2))

  // 映射回原始索引
  const startOriginal = sampleIndices[Math.min(bestStartSample, sampleIndices.length - 1)]
  const periodOriginal = Math.max(2, Math.round(bestL * sampleStep))

  // 接缝精修：在原始索引域对 (start, period) 做局部搜索，最小化接缝差异
  const getMultiFeatureAt = async (frameIndex: number): Promise<MultiFeature> => {
    const idx = Math.max(0, Math.min(total - 1, frameIndex))
    const img = new Image()
    img.src = frames[idx].url
    await new Promise((resolve) => (img.onload = resolve))

    // 32x32
    canvas.width = 32
    canvas.height = 32
    ctx.drawImage(img, 0, 0, 32, 32)
    const img32 = ctx.getImageData(0, 0, 32, 32)
    // 8x8
    canvas.width = 8
    canvas.height = 8
    ctx.drawImage(img, 0, 0, 8, 8)
    const img8 = ctx.getImageData(0, 0, 8, 8)
    return {
      lowRes: extractLowResPatch(img32),
      gradHist: extractGradHist(img32),
      aHash: extractAHash(img8)
    }
  }

  const featureCache = new Map<number, MultiFeature>()
  const getCached = async (i: number) => {
    if (!featureCache.has(i)) featureCache.set(i, await getMultiFeatureAt(i))
    return featureCache.get(i) as MultiFeature
  }

  const seamCost = async (s: number, p: number): Promise<number> => {
    // 评估接缝处几对邻近帧的差异
    const pairs: Array<[number, number]> = []
    pairs.push([s, s + p])
    if (s + 1 < total && s + p + 1 < total) pairs.push([s + 1, s + p + 1])
    if (s - 1 >= 0 && s + p - 1 < total) pairs.push([s - 1, s + p - 1])

    let sum = 0
    let cnt = 0
    for (const [a, b] of pairs) {
      const fa = await getCached(a)
      const fb = await getCached(b)
      sum += combinedDistance(fa, fb)
      cnt++
    }
    return cnt > 0 ? sum / cnt : Infinity
  }

  let refinedStart = Math.min(startOriginal, total - 1)
  let refinedPeriod = Math.min(periodOriginal, Math.max(2, total - refinedStart))
  let refinedCost = await seamCost(refinedStart, refinedPeriod)
  const startRange = 2
  const periodRange = 1
  for (let ds = -startRange; ds <= startRange; ds++) {
    const s = Math.max(0, Math.min(total - 2, startOriginal + ds))
    for (let dp = -periodRange; dp <= periodRange; dp++) {
      const p = Math.max(2, Math.min(total - s - 1, periodOriginal + dp))
      const c = await seamCost(s, p)
      if (c < refinedCost) {
        refinedCost = c
        refinedStart = s
        refinedPeriod = p
      }
    }
  }

  return {
    start: refinedStart,
    period: refinedPeriod,
    confidence
  }
}

