import Papa from 'papaparse'

export const ALL_INDUSTRIES = '전체 업종'
export const MIN_STORE_COUNT = 5

export const RISK_LEVELS = [
  { key: 'low', label: '낮음', color: '#86c995' },
  { key: 'normal', label: '보통', color: '#f2cf63' },
  { key: 'caution', label: '주의', color: '#ee944f' },
  { key: 'high', label: '높음', color: '#db5353' },
]

const SEOUL_DISTRICTS = {
  11110: '종로구', 11140: '중구', 11170: '용산구', 11200: '성동구',
  11215: '광진구', 11230: '동대문구', 11260: '중랑구', 11290: '성북구',
  11305: '강북구', 11320: '도봉구', 11350: '노원구', 11380: '은평구',
  11410: '서대문구', 11440: '마포구', 11470: '양천구', 11500: '강서구',
  11530: '구로구', 11545: '금천구', 11560: '영등포구', 11590: '동작구',
  11620: '관악구', 11650: '서초구', 11680: '강남구', 11710: '송파구',
  11740: '강동구',
}

function decodeCsv(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, '')
  } catch {
    // Seoul open-data CSV files are commonly distributed as CP949/EUC-KR.
    return new TextDecoder('euc-kr').decode(buffer)
  }
}

export async function loadCsv(file) {
  const response = await fetch(file)
  if (!response.ok) throw new Error(`CSV를 불러오지 못했습니다. (${response.status})`)
  const text = decodeCsv(await response.arrayBuffer())

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, errors }) => errors.length ? reject(errors[0]) : resolve(data),
      error: reject,
    })
  })
}

export function quarterLabelToCode(label) {
  if (!label) return null
  const match = label.match(/^(\d{4})\s*Q([1-4])$/)
  return match ? `${match[1]}${match[2]}` : null
}

export function computeQuantileBuckets(values, buckets = 4) {
  if (!values.length) return []
  const sorted = values.slice().sort((a, b) => a - b)
  const thresholds = []
  for (let i = 1; i < buckets; i += 1) {
    thresholds.push(sorted[Math.min(Math.floor((i * sorted.length) / buckets), sorted.length - 1)])
  }
  return thresholds
}

export function getRiskLevel(rate, thresholds) {
  if (!Number.isFinite(rate)) return null
  if (rate <= thresholds[0]) return RISK_LEVELS[0]
  if (rate <= thresholds[1]) return RISK_LEVELS[1]
  if (rate <= thresholds[2]) return RISK_LEVELS[2]
  return RISK_LEVELS[3]
}

export function getDongStats(item, quarterCode, industry = ALL_INDUSTRIES) {
  if (!item || !quarterCode) return null
  if (!industry || industry === ALL_INDUSTRIES) return item.quarters?.[quarterCode] || null

  const stats = item.industries?.[quarterCode]?.[industry]
  if (!stats) return null
  const stores = Number(stats['점포_수']) || 0
  const closed = Number(stats['폐업_점포_수']) || 0
  return {
    '점포_수': stores,
    '폐업_점포_수': closed,
    '개업_점포_수': null,
    '폐업_률': stores ? (closed / stores) * 100 : 0,
  }
}

export function getSeoulAverage(processed, quarterCode, industry) {
  let stores = 0
  let closed = 0
  Object.values(processed || {}).forEach((item) => {
    const stats = getDongStats(item, quarterCode, industry)
    if (!stats) return
    stores += Number(stats['점포_수']) || 0
    closed += Number(stats['폐업_점포_수']) || 0
  })
  return stores ? (closed / stores) * 100 : null
}

export function getDistrictNames(processed) {
  return Array.from(new Set(
    Object.keys(processed || {}).map((dongCode) => getDistrictName(dongCode)),
  )).filter((name) => name !== '서울특별시')
}

export function getDistrictStats(processed, districtName, quarterCode, industry = ALL_INDUSTRIES) {
  let stores = 0
  let closed = 0
  let opened = 0
  let hasOpened = false

  Object.entries(processed || {}).forEach(([dongCode, item]) => {
    if (getDistrictName(dongCode) !== districtName) return
    const stats = getDongStats(item, quarterCode, industry)
    if (!stats) return
    stores += Number(stats['점포_수']) || 0
    closed += Number(stats['폐업_점포_수']) || 0
    if (Number.isFinite(stats['개업_점포_수'])) {
      opened += Number(stats['개업_점포_수'])
      hasOpened = true
    }
  })

  if (!stores && !closed) return null
  return {
    '점포_수': stores,
    '폐업_점포_수': closed,
    '개업_점포_수': hasOpened ? opened : null,
    '폐업_률': stores ? (closed / stores) * 100 : 0,
  }
}

export function getDistrictIndustryStats(processed, districtName, quarterCode) {
  const result = {}
  Object.entries(processed || {}).forEach(([dongCode, item]) => {
    if (getDistrictName(dongCode) !== districtName) return
    Object.entries(item.industries?.[quarterCode] || {}).forEach(([name, stats]) => {
      if (!result[name]) result[name] = { '점포_수': 0, '폐업_점포_수': 0 }
      result[name]['점포_수'] += Number(stats['점포_수']) || 0
      result[name]['폐업_점포_수'] += Number(stats['폐업_점포_수']) || 0
    })
  })
  return result
}

export function getIndustryNames(processed) {
  const names = new Set()
  Object.values(processed || {}).forEach((item) => {
    Object.values(item.industries || {}).forEach((industries) => {
      Object.keys(industries).forEach((name) => names.add(name))
    })
  })
  return [ALL_INDUSTRIES, ...Array.from(names).sort((a, b) => a.localeCompare(b, 'ko'))]
}

export function topIndustries(industryStats, minStores = MIN_STORE_COUNT, topN = 5) {
  if (!industryStats) return []
  return Object.entries(industryStats)
    .map(([name, stats]) => {
      const stores = Number(stats['점포_수']) || 0
      const closed = Number(stats['폐업_점포_수']) || 0
      return { name, stores, closed, rate: stores ? (closed / stores) * 100 : 0 }
    })
    .filter((item) => item.stores >= minStores && item.closed > 0)
    .sort((a, b) => b.rate - a.rate || b.closed - a.closed)
    .slice(0, topN)
}

export function topIndustriesWithFallback(industryStats, minStores = MIN_STORE_COUNT, topN = 5) {
  const preferred = topIndustries(industryStats, minStores, topN)
  if (preferred.length >= topN || minStores <= 1) return { items: preferred, minStores }
  const fallback = topIndustries(industryStats, 1, topN)
  return fallback.length > preferred.length
    ? { items: fallback, minStores: 1 }
    : { items: preferred, minStores }
}

export function getDistrictName(dongCode) {
  return SEOUL_DISTRICTS[String(dongCode).slice(0, 5)] || '서울특별시'
}
