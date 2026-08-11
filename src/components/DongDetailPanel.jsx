import {
  MIN_STORE_COUNT,
  computeQuantileBuckets,
  getDistrictIndustryStats,
  getDistrictName,
  getDistrictNames,
  getDistrictStats,
  getDongStats,
  getRiskLevel,
  getSeoulAverage,
  quarterLabelToCode,
  topIndustriesWithFallback,
} from '../utils/dataProcessor'

function MetricCard({ label, value, suffix = '개' }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value == null ? '-' : `${Number(value).toLocaleString('ko-KR')}${suffix}`}</strong>
    </div>
  )
}

export default function DongDetailPanel({
  dongCode,
  districtName,
  quarter,
  industry,
  processed,
  onRecommendation,
}) {
  if (!dongCode && !districtName) {
    return (
      <aside className="detail-panel empty">
        <div className="empty-state-icon" aria-hidden="true">+</div>
        <h2>지역을 선택해주세요</h2>
        <p>지도에서 행정동을 클릭하면<br />폐업 현황과 업종별 데이터를 확인할 수 있습니다.</p>
      </aside>
    )
  }

  const quarterCode = quarterLabelToCode(quarter)
  const districtMode = Boolean(districtName && !dongCode)
  const info = dongCode ? processed?.[dongCode] : null
  const stats = districtMode
    ? getDistrictStats(processed, districtName, quarterCode, industry)
    : getDongStats(info, quarterCode, industry)
  const seoulAverage = getSeoulAverage(processed, quarterCode, industry)
  const rates = districtMode
    ? getDistrictNames(processed)
      .map((name) => getDistrictStats(processed, name, quarterCode, industry)?.['폐업_률'])
      .filter(Number.isFinite)
    : Object.values(processed || {})
      .map((item) => getDongStats(item, quarterCode, industry)?.['폐업_률'])
      .filter(Number.isFinite)
  const risk = getRiskLevel(stats?.['폐업_률'], computeQuantileBuckets(rates, 4))
  const difference = stats && seoulAverage != null ? stats['폐업_률'] - seoulAverage : null
  const { items: top5, minStores: appliedMinStores } = topIndustriesWithFallback(
    districtMode
      ? getDistrictIndustryStats(processed, districtName, quarterCode)
      : info?.industries?.[quarterCode],
    MIN_STORE_COUNT,
    5,
  )

  return (
    <aside className="detail-panel">
      <div className="detail-scroll">
        <div className="dong-heading">
          <div>
            <h2>{districtMode ? districtName : info?.name || '행정동 정보 없음'}</h2>
            <p>{districtMode ? '서울특별시 · 자치구 합계' : getDistrictName(dongCode)}</p>
          </div>
          {risk && (
            <span className={`risk-badge risk-${risk.key}`}>
              폐업 위험도 · {risk.label}
            </span>
          )}
        </div>

        {stats ? (
          <>
            <div className="metric-grid">
              <MetricCard label="폐업률" value={stats['폐업_률'].toFixed(2)} suffix="%" />
              <MetricCard label="폐업점포" value={stats['폐업_점포_수']} />
              <MetricCard label="전체점포" value={stats['점포_수']} />
              <MetricCard label="개업점포" value={stats['개업_점포_수']} />
            </div>

            {seoulAverage != null && (
              <div className="average-comparison">
                <div><span>서울 평균 폐업률</span><strong>{seoulAverage.toFixed(2)}%</strong></div>
                <div className={difference > 0 ? 'difference-up' : difference < 0 ? 'difference-down' : ''}>
                  <span>평균 대비</span>
                  <strong>{difference > 0 ? '+' : ''}{difference.toFixed(2)}%p</strong>
                </div>
              </div>
            )}
          </>
        ) : <p className="no-data">선택한 조건의 데이터가 없습니다.</p>}

        <section className="top-industries">
          <div className="section-title">
            <h3>폐업 위험 업종 TOP 5</h3>
            <span>최소 {appliedMinStores}개 점포 기준</span>
          </div>
          {top5.length ? (
            <ol>
              {top5.map((item, index) => (
                <li key={item.name}>
                  <span className="rank">{index + 1}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <p>폐업률 {item.rate.toFixed(1)}% · 폐업 {item.closed.toLocaleString('ko-KR')}개</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="no-data compact">표시할 업종 데이터가 없습니다.</p>}
        </section>
      </div>

      <div className="detail-footer">
        <button className="recommend-button" onClick={() => onRecommendation(districtMode ? districtName : dongCode)}>
          이 지역 업종 추천받기 <span aria-hidden="true">→</span>
        </button>
      </div>
    </aside>
  )
}
