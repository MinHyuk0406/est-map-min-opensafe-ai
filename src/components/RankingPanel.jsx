import {
  ANALYSIS_MODES,
  MODE_STYLES,
  formatAnalysisValue,
} from '../utils/dataProcessor'

export default function RankingPanel({
  mode,
  ranking,
  distribution,
  selectedDongCode,
  onSelectDong,
  unavailable,
}) {
  const modeStyle = MODE_STYLES[mode]

  return (
    <section className="ranking-panel" aria-label={modeStyle.rankingTitle}>
      <div className="ranking-heading">
        <span>서울 행정동 분석</span>
        <h2>{modeStyle.rankingTitle}</h2>
      </div>
      {mode === ANALYSIS_MODES.MARKET_TYPE ? (
        <div className="type-distribution">
          {modeStyle.levels.map((level) => (
            <div key={level.key}>
              <span className="distribution-swatch" style={{ backgroundColor: level.color }} />
              <span>{level.label}</span>
              <strong>{distribution?.[level.key] || 0}개 동</strong>
            </div>
          ))}
        </div>
      ) : unavailable ? (
        <p className="ranking-empty">이전 분기 데이터가 없어 변화량을 계산할 수 없습니다.</p>
      ) : ranking.length ? (
        <ol>
          {ranking.map((row, index) => (
            <li key={row.code}>
              <button
                type="button"
                className={selectedDongCode === row.code ? 'selected' : ''}
                onClick={() => onSelectDong(row.code)}
              >
                <span className="ranking-number">{index + 1}</span>
                <span className="ranking-name">{row.name}</span>
                <strong>{formatAnalysisValue(row.value, mode)}</strong>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="ranking-empty">조건에 해당하는 지역이 없습니다.</p>
      )}
    </section>
  )
}
