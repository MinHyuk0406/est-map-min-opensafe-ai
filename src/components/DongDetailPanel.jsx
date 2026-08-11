import ClosureTrendChart from './ClosureTrendChart'
import MarketQuadrant from './MarketQuadrant'
import {
  ALL_INDUSTRIES,
  ANALYSIS_MODES,
  MARKET_TYPE_DESCRIPTIONS,
  MIN_STORE_COUNT,
  formatAnalysisValue,
  generateTrendSummary,
  getAnalysisValue,
  getDistrictName,
  getDongDisplayIndex,
  getDongStats,
  getMarketTypeData,
  getQuarterlyTrend,
  quarterLabelToCode,
  topIndustriesWithFallback,
} from '../utils/dataProcessor'
import { buildFactSummary, getMarketContext } from '../services/dataService'
import { formatCurrency, formatNumber, formatPercent, formatPopulation } from '../utils/formatters'

function DataRow({ label, value, tone = '' }) {
  return <div className="detail-data-row"><span>{label}</span><strong className={tone}>{value ?? '-'}</strong></div>
}

function DetailSection({ title, description, children, className = '' }) {
  return (
    <section className={`detail-section ${className}`}>
      <div className="detail-section-heading"><h3>{title}</h3>{description && <span>{description}</span>}</div>
      {children}
    </section>
  )
}

function AverageComparison({ label, localValue, averageValue, localName }) {
  if (!Number.isFinite(localValue) || !Number.isFinite(averageValue)) return null
  const difference = localValue - averageValue
  const maximum = Math.max(localValue, averageValue, 0.1) * 1.25
  return (
    <div className="average-rate-row">
      <div className="average-rate-heading">
        <strong>{label}</strong>
        <div><b>{localValue.toFixed(2)}%</b><span>서울 {averageValue.toFixed(2)}%</span><em>{difference > 0 ? '+' : ''}{difference.toFixed(2)}%p</em></div>
      </div>
      <div className="average-rate-track">
        <i className="local-rate-dot" style={{ left: `${(localValue / maximum) * 100}%` }} />
        <i className="seoul-rate-line" style={{ left: `${(averageValue / maximum) * 100}%` }} />
      </div>
      <div className="average-rate-labels"><span>{localName}</span><span>서울 평균</span><span>평균 대비</span></div>
    </div>
  )
}

export default function DongDetailPanel({
  dongCode,
  quarter,
  industry,
  analysisMode,
  processed,
  marketContext,
  contextError,
}) {
  if (!dongCode) {
    return (
      <aside className="detail-panel empty">
        <div className="empty-state-icon" aria-hidden="true">+</div>
        <h2>지역을 선택해주세요</h2>
        <p>지도 또는 지역 순위에서 행정동을 선택하면<br />상권 변화와 참고 데이터를 확인할 수 있습니다.</p>
      </aside>
    )
  }

  const quarterCode = quarterLabelToCode(quarter)
  const info = processed?.[dongCode]
  const stats = getDongStats(info, quarterCode, industry)
  const marketData = getMarketTypeData(processed, quarterCode, industry)
  const marketType = marketData.points.find((point) => point.code === dongCode) || null
  const context = getMarketContext(marketContext, processed, quarterCode, dongCode, industry)
  const trend = getQuarterlyTrend(info, industry)
  const trendSummary = generateTrendSummary(trend)
  const facts = buildFactSummary(stats, marketData.averages, context.sales, context.floatingPopulation, trendSummary)
  const analysisValue = getAnalysisValue(info, quarterCode, industry, analysisMode)
  const sampleInsufficient = Number.isFinite(stats?.['점포_수']) && stats['점포_수'] < MIN_STORE_COUNT
  const selectedIndustryStats = industry === ALL_INDUSTRIES
    ? info?.industries?.[quarterCode]
    : { [industry]: info?.industries?.[quarterCode]?.[industry] }
  const { items: top5, minStores: appliedMinStores } = topIndustriesWithFallback(selectedIndustryStats, MIN_STORE_COUNT, 5)
  const quarterLabel = `${quarterCode.slice(0, 4)}년 ${quarterCode.slice(4)}분기`
  const netOpenClose = Number.isFinite(stats?.['개업_점포_수']) && Number.isFinite(stats?.['폐업_점포_수'])
    ? stats['개업_점포_수'] - stats['폐업_점포_수']
    : null
  const displayIndex = getDongDisplayIndex(processed, dongCode)
  const marketDescription = marketType ? MARKET_TYPE_DESCRIPTIONS[marketType.key] : null

  return (
    <aside className="detail-panel">
      <div className="detail-scroll">
        <div className="dong-heading detailed">
          <div><div className="region-eyebrow">지역 분석 <span>/ {displayIndex}</span></div><h2>{info?.name || '행정동 정보 없음'}</h2><p>{getDistrictName(dongCode)} · {quarterLabel} · {industry}</p></div>
          <div className="detail-badges">
            {sampleInsufficient && <span className="sample-badge">표본 부족</span>}
          </div>
        </div>

        <section className="market-overview">
          <span>시장 유형</span>
          {sampleInsufficient ? <strong>표본 부족</strong> : <strong>{marketType?.label || '분류 데이터 없음'}</strong>}
          {marketDescription && <p>{marketDescription}</p>}
          {marketType && <div className="market-direction"><b>개업 {marketType.openDifference >= 0 ? '↑' : '↓'}</b><i /> <b>폐업 {marketType.closureDifference >= 0 ? '↑' : '↓'}</b></div>}
        </section>

        {stats && marketData.averages && (
          <DetailSection title="서울 평균 비교">
            <div className="average-rate-list">
              <AverageComparison label="폐업률" localValue={stats['폐업_률']} averageValue={marketData.averages.closureRate} localName={info?.name} />
              <AverageComparison label="개업률" localValue={stats['개업_률']} averageValue={marketData.averages.openRate} localName={info?.name} />
            </div>
          </DetailSection>
        )}

        {analysisMode !== ANALYSIS_MODES.CLOSURE_RATE && analysisMode !== ANALYSIS_MODES.MARKET_TYPE && Number.isFinite(analysisValue) && (
          <div className="active-analysis-value">
            <span>{analysisMode === ANALYSIS_MODES.CLOSURE_CHANGE ? '전분기 대비 폐업률 변화' : '현재 분기 개폐업 순증감'}</span>
            <strong>{formatAnalysisValue(analysisValue, analysisMode)}</strong>
          </div>
        )}
        {analysisMode === ANALYSIS_MODES.CLOSURE_CHANGE && !Number.isFinite(analysisValue) && (
          <div className="active-analysis-value unavailable">전분기 비교 데이터 없음</div>
        )}

        <DetailSection title="핵심 개폐업 지표" description="선택 업종 기준">
          {stats ? (
            <><div className="core-metrics"><div><span>폐업 점포</span><strong>{formatNumber(stats['폐업_점포_수'], '개') || '데이터 없음'}</strong></div><div><span>개업 점포</span><strong>{formatNumber(stats['개업_점포_수'], '개') || '데이터 없음'}</strong></div><div><span>개폐업 순증감</span><strong className={netOpenClose < 0 ? 'negative' : netOpenClose > 0 ? 'positive' : ''}>{Number.isFinite(netOpenClose) ? `${netOpenClose > 0 ? '+' : ''}${formatNumber(netOpenClose, '개')}` : '데이터 없음'}</strong></div></div><p className="total-store-note">전체 점포 {formatNumber(stats['점포_수'], '개') || '데이터 없음'}</p></>
          ) : <p className="section-empty">선택한 조건의 점포 데이터가 없습니다.</p>}
          <p className="metric-note">개폐업 순증감은 개업 건수에서 폐업 건수를 뺀 값이며, 전체 점포 수의 실제 증감을 의미하지 않습니다.</p>
        </DetailSection>

        <DetailSection title="시장 내 위치" description="개업률 × 폐업률">
          {sampleInsufficient ? (
            <p className="section-empty">점포 수 {MIN_STORE_COUNT}개 미만으로 시장 유형을 분류하지 않습니다.</p>
          ) : marketType ? (
            <MarketQuadrant marketType={marketType} averages={marketData.averages} points={marketData.points} selectedDongCode={dongCode} selectedDongName={info?.name} />
          ) : <p className="section-empty">시장 유형을 계산할 데이터가 없습니다.</p>}
        </DetailSection>

        <DetailSection title="분기별 변화" description="2025년 1~4분기">
          <div className="trend-pair">
            <div className="trend-chart-card"><strong>폐업률</strong><ClosureTrendChart data={trend} /></div>
            <div className="trend-chart-card"><strong>개업률</strong><ClosureTrendChart data={trend} valueKey="openRate" metricLabel="개업률" /></div>
          </div>
          {trendSummary && <p className={`trend-summary ${trendSummary.direction}`}>{trendSummary.text}</p>}
        </DetailSection>

        {facts.length > 0 && (
          <DetailSection title="데이터 요약"><ul className="fact-summary">{facts.map((fact) => <li key={fact}>{fact}</li>)}</ul></DetailSection>
        )}

        <section className="top-industries">
          <div className="section-title"><h3>{industry === ALL_INDUSTRIES ? '폐업률 높은 업종 TOP 5' : '선택 업종 현황'}</h3><span>최소 {appliedMinStores}개 점포 기준</span></div>
          {top5.length ? <ol>{top5.map((item, index) => <li key={item.name}><span className="rank">{index + 1}</span><div><strong>{item.name}</strong><p>폐업률 {item.rate.toFixed(1)}% · 폐업 {item.closed.toLocaleString('ko-KR')}개</p></div></li>)}</ol> : <p className="section-empty">표시할 업종 데이터가 없습니다.</p>}
        </section>

        <DetailSection title="참고 데이터" description="판단을 위한 보조 지표" className="reference-section">
          {contextError && <p className="context-warning">참고 데이터 없음 · {contextError}</p>}
          <div className="reference-group"><h4>추정매출</h4>{context.sales ? <div className="detail-data-grid single-column"><DataRow label="선택 분기 추정매출" value={formatCurrency(context.sales.amount)} /><DataRow label="매출 건수" value={formatNumber(context.sales.count, '건')} /><DataRow label="전분기 대비" value={formatPercent(context.sales.changeRate, 1, true) || '비교 데이터 없음'} tone={context.sales.changeRate < 0 ? 'negative' : context.sales.changeRate > 0 ? 'positive' : ''} /></div> : <p className="section-empty">해당 업종의 추정매출 데이터가 제공되지 않습니다.</p>}</div>
          <div className="reference-group"><h4>행정동 전체 인구</h4><div className="detail-data-grid single-column"><DataRow label="분기 총 유동인구" value={formatPopulation(context.floatingPopulation?.total) || '데이터 없음'} />{Number.isFinite(context.floatingPopulation?.changeRate) && <DataRow label="전분기 대비" value={formatPercent(context.floatingPopulation.changeRate, 1, true)} tone={context.floatingPopulation.changeRate < 0 ? 'negative' : 'positive'} />}<DataRow label="상주인구" value={formatPopulation(context.residentPopulation?.total) || '데이터 없음'} /></div></div>
          <p className="metric-note">유동인구와 상주인구는 업종별 수치가 아닌 해당 행정동 전체 값입니다.</p>
        </DetailSection>
      </div>
    </aside>
  )
}
