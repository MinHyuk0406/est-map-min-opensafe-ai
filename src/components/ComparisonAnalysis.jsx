import { useEffect, useMemo, useState } from 'react'
import { DATA_PATHS } from '../config/dataPaths'
import { fetchOpenSafeScenario } from '../services/openSafeApi'
import { fetchJsonCached, mergeMarketContext } from '../services/staticDataService'
import { ALL_INDUSTRIES, getDistrictName, getDongStats } from '../utils/dataProcessor'
import { AiMetricComparison, MarketPositionComparison, MarketRadarComparison } from './ComparisonCharts'
import '../styles/comparison.css'

const QUARTERS = ['20251', '20252', '20253', '20254']
const LATEST_QUARTER = '20254'

function annualStats(dong, industry) {
  const rows = QUARTERS.map((quarter) => getDongStats(dong, quarter, industry)).filter(Boolean)
  if (!rows.length) return null
  const stores = rows.reduce((sum, row) => sum + (row['점포_수'] || 0), 0) / rows.length
  const opened = rows.reduce((sum, row) => sum + (row['개업_점포_수'] || 0), 0)
  const closed = rows.reduce((sum, row) => sum + (row['폐업_점포_수'] || 0), 0)
  return { stores, opened, closed, closureRate: stores ? closed / stores * 100 : null, netChangeRate: stores ? (opened - closed) / stores * 100 : null }
}

function total(values, average = false) {
  const valid = values.filter(Number.isFinite)
  if (!valid.length) return null
  const sum = valid.reduce((result, value) => result + value, 0)
  return average ? sum / valid.length : sum
}

function percentile(value, values) {
  const valid = values.filter(Number.isFinite)
  if (!Number.isFinite(value) || !valid.length) return 0
  return Math.round((valid.filter((item) => item < value).length + valid.filter((item) => item === value).length / 2) / valid.length * 100)
}

function marketMetrics(context, code, industryCode, stats) {
  const floating = total(QUARTERS.map((quarter) => context.floatingPopulation?.[quarter]?.[code]?.total))
  const resident = total(QUARTERS.map((quarter) => context.residentPopulation?.[quarter]?.[code]?.total), true)
  const sales = total(QUARTERS.map((quarter) => context.sales?.[quarter]?.[code]?.[industryCode]?.amount))
  return { floating, resident, sales, netChange: stats?.netChangeRate, stability: Number.isFinite(stats?.closureRate) ? 100 - stats.closureRate : null }
}

function textNumber(value, digits = 0) { return Number.isFinite(value) ? value.toLocaleString('ko-KR', { maximumFractionDigits: digits }) : '-' }

export default function ComparisonAnalysis({ baseDongCode, processed, initialIndustry }) {
  const [targetDongCode, setTargetDongCode] = useState('')
  const [industry, setIndustry] = useState(initialIndustry === ALL_INDUSTRIES ? '' : initialIndustry)
  const [context, setContext] = useState({ sales: {}, floatingPopulation: {}, residentPopulation: {} })
  const [loadingContext, setLoadingContext] = useState(true)
  const [analysis, setAnalysis] = useState(null)
  const [compared, setCompared] = useState(false)
  const [notice, setNotice] = useState('')

  const baseDong = processed?.[baseDongCode]
  const targetOptions = useMemo(() => Object.entries(processed).filter(([code, dong]) => code !== baseDongCode && dong?.industries?.[LATEST_QUARTER]).map(([code, dong]) => ({ code, name: dong.name, district: getDistrictName(code) })).sort((a, b) => a.name.localeCompare(b.name, 'ko')), [processed, baseDongCode])
  useEffect(() => { if (!targetOptions.some((item) => item.code === targetDongCode)) setTargetDongCode(targetOptions[0]?.code || '') }, [targetOptions, targetDongCode])
  const targetDong = processed?.[targetDongCode]
  const industries = useMemo(() => Object.entries(baseDong?.industries?.[LATEST_QUARTER] || {}).filter(([name, row]) => row?.code && targetDong?.industries?.[LATEST_QUARTER]?.[name]?.code === row.code).map(([name]) => name).sort((a, b) => a.localeCompare(b, 'ko')), [baseDong, targetDong])
  useEffect(() => { if (!industries.includes(industry)) setIndustry(industries.includes(initialIndustry) ? initialIndustry : industries[0] || '') }, [industries, industry, initialIndustry])

  useEffect(() => {
    let active = true
    setLoadingContext(true)
    Promise.all(QUARTERS.map((quarter) => fetchJsonCached(DATA_PATHS.marketContext(quarter), `${quarter} 비교 데이터`)))
      .then((items) => { if (active) setContext(items.reduce((current, item) => mergeMarketContext(current, item), { sales: {}, floatingPopulation: {}, residentPopulation: {} })) })
      .catch(() => { if (active) setNotice('매출·인구 데이터 일부를 불러오지 못해 비교 지표가 제한될 수 있습니다.') })
      .finally(() => { if (active) setLoadingContext(false) })
    return () => { active = false }
  }, [])

  const industryCode = baseDong?.industries?.[LATEST_QUARTER]?.[industry]?.code
  const targetIndustryCode = targetDong?.industries?.[LATEST_QUARTER]?.[industry]?.code
  const leftStats = annualStats(baseDong, industry)
  const rightStats = annualStats(targetDong, industry)
  const radarMetrics = useMemo(() => {
    if (!industry || loadingContext) return []
    const metricsByDong = Object.entries(processed).map(([code, dong]) => {
      const codeForIndustry = dong?.industries?.[LATEST_QUARTER]?.[industry]?.code
      return [code, codeForIndustry ? marketMetrics(context, code, codeForIndustry, annualStats(dong, industry)) : null]
    }).filter(([, metric]) => metric)
    const left = metricsByDong.find(([code]) => code === baseDongCode)?.[1] || {}
    const right = metricsByDong.find(([code]) => code === targetDongCode)?.[1] || {}
    const defs = [['floating', '유동인구'], ['resident', '상주인구'], ['sales', '추정 매출'], ['netChange', '순점포 증감률'], ['stability', '상권 안정성']]
    return defs.map(([key, label]) => ({ key, label, leftScore: percentile(left[key], metricsByDong.map(([, item]) => item[key])), rightScore: percentile(right[key], metricsByDong.map(([, item]) => item[key])) }))
  }, [baseDongCode, context, industry, loadingContext, processed, targetDongCode])

  const reset = () => { setCompared(false); setAnalysis(null); setNotice('') }
  const runComparison = async () => {
    if (!industryCode || !targetIndustryCode) return
    setCompared(true)
    setNotice('')
    try {
      const [left, right] = await Promise.all([
        fetchOpenSafeScenario({ dong_code: String(baseDongCode), industry_code: String(industryCode) }),
        fetchOpenSafeScenario({ dong_code: String(targetDongCode), industry_code: String(targetIndustryCode) }),
      ])
      setAnalysis({ left, right })
    } catch {
      setAnalysis(null)
      setNotice('기본 상권 비교는 완료되었습니다. AI 예측 지표는 현재 불러올 수 없습니다.')
    }
  }

  return <div className="comparison-analysis">
    <section className="comparison-controls">
      <div><strong>비교 조건</strong><span>현재 지역과 같은 업종을 기준으로 다른 행정동을 비교합니다.</span></div>
      <label><span>지역 A</span><input value={baseDong?.name || '-'} disabled /></label>
      <label><span>지역 B</span><select value={targetDongCode} onChange={(event) => { setTargetDongCode(event.target.value); reset() }}>{targetOptions.map((item) => <option key={item.code} value={item.code}>{item.name} · {item.district}</option>)}</select></label>
      <label><span>업종</span><select value={industry} onChange={(event) => { setIndustry(event.target.value); reset() }} disabled={!industries.length || loadingContext}>{industries.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      <button type="button" onClick={runComparison} disabled={!industry || !targetDongCode || loadingContext}>두 지역 비교하기</button>
    </section>
    {notice && <p className="comparison-notice">{notice}</p>}
    {!compared ? <p className="comparison-empty">지역과 업종을 선택한 뒤 비교를 실행하세요.</p> : <div className="comparison-results">
      <div className="comparison-top-row">
        {radarMetrics.length > 0 && <MarketRadarComparison leftName={baseDong?.name || '지역 A'} rightName={targetDong?.name || '지역 B'} metrics={radarMetrics} />}
        {analysis && <AiMetricComparison leftName={baseDong?.name || '지역 A'} rightName={targetDong?.name || '지역 B'} leftAi={analysis.left} rightAi={analysis.right} />}
      </div>
      {analysis && <MarketPositionComparison leftName={baseDong?.name || '지역 A'} rightName={targetDong?.name || '지역 B'} leftAi={analysis.left} rightAi={analysis.right} />}
      <div className="comparison-basic-summary"><strong>{baseDong?.name || '지역 A'}</strong><span>연평균 점포 {textNumber(leftStats?.stores)}개 · 폐업률 {textNumber(leftStats?.closureRate, 1)}%</span><strong>{targetDong?.name || '지역 B'}</strong><span>연평균 점포 {textNumber(rightStats?.stores)}개 · 폐업률 {textNumber(rightStats?.closureRate, 1)}%</span></div>
    </div>}
  </div>
}
