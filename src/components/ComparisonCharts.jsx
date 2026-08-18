function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum)
}

function pointAt(index, value, total, centerX, centerY, radius) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total
  const distance = radius * clamp(value, 0, 100) / 100
  return { x: centerX + Math.cos(angle) * distance, y: centerY + Math.sin(angle) * distance }
}

function polygon(values, radius, centerX, centerY) {
  return values.map((value, index) => pointAt(index, value, values.length, centerX, centerY, radius)).map(({ x, y }) => `${x},${y}`).join(' ')
}

export function MarketRadarComparison({ leftName, rightName, metrics }) {
  const centerX = 280
  const centerY = 165
  const radius = 112
  const total = metrics.length
  const left = metrics.map((metric) => metric.leftScore)
  const right = metrics.map((metric) => metric.rightScore)

  return (
    <article className="comparison-card comparison-radar-card">
      <header className="comparison-card-heading"><div><span>연간 통계</span><h3>상권 지표 비교</h3></div><div className="comparison-legend"><span className="left"><i />{leftName}</span><span className="right"><i />{rightName}</span></div></header>
      <div className="comparison-radar-canvas">
        <svg viewBox="0 0 560 340" role="img" aria-label={`${leftName}과 ${rightName} 상권 지표 비교`}>
          {[25, 50, 75, 100].map((level) => <polygon key={level} className="comparison-radar-grid" points={polygon(Array(total).fill(level), radius, centerX, centerY)} />)}
          {metrics.map((metric, index) => {
            const end = pointAt(index, 100, total, centerX, centerY, radius)
            const label = pointAt(index, 100, total, centerX, centerY, radius + 30)
            const anchor = label.x < centerX - 10 ? 'end' : label.x > centerX + 10 ? 'start' : 'middle'
            return <g key={metric.key}><line className="comparison-radar-axis" x1={centerX} y1={centerY} x2={end.x} y2={end.y} /><text className="comparison-radar-label" x={label.x} y={label.y + 4} textAnchor={anchor}>{metric.label}</text></g>
          })}
          <polygon className="comparison-radar-area left" points={polygon(left, radius, centerX, centerY)} />
          <polygon className="comparison-radar-area right" points={polygon(right, radius, centerX, centerY)} />
        </svg>
      </div>
    </article>
  )
}

function winner(left, right, leftName, rightName) {
  if (!Number.isFinite(left) || !Number.isFinite(right) || left === right) return '동일'
  return left > right ? `${leftName} 우세` : `${rightName} 우세`
}

export function AiMetricComparison({ leftName, rightName, leftAi, rightAi }) {
  const metrics = [
    ['창업 적합도', leftAi?.market?.startup_fit, rightAi?.market?.startup_fit],
    ['단기 안정성', Number.isFinite(leftAi?.market?.current_risk) ? 100 - leftAi.market.current_risk : null, Number.isFinite(rightAi?.market?.current_risk) ? 100 - rightAi.market.current_risk : null],
    ['사업 회복력', leftAi?.resilience?.score, rightAi?.resilience?.score],
  ]
  return (
    <article className="comparison-card comparison-ai-card">
      <header className="comparison-card-heading"><div><span>AI 분석</span><h3>예측 지표 비교</h3></div></header>
      <div className="comparison-ai-list">
        {metrics.map(([label, left, right], index) => <div className={index === 0 ? 'featured' : ''} key={label}>
          <div className="comparison-ai-title"><strong>{label}</strong><em>{winner(left, right, leftName, rightName)}</em></div>
          <div className="comparison-ai-row"><span>{leftName}</span><div><i style={{ width: `${clamp(Number(left) || 0, 0, 100)}%` }} /></div><b>{Number.isFinite(left) ? `${Math.round(left)}점` : '-'}</b></div>
          <div className="comparison-ai-row right"><span>{rightName}</span><div><i style={{ width: `${clamp(Number(right) || 0, 0, 100)}%` }} /></div><b>{Number.isFinite(right) ? `${Math.round(right)}점` : '-'}</b></div>
        </div>)}
      </div>
    </article>
  )
}

export function MarketPositionComparison({ leftName, rightName, leftAi, rightAi }) {
  return (
    <article className="comparison-card comparison-position-card">
      <header className="comparison-card-heading"><div><span>보조 비교</span><h3>시장 위치 비교</h3></div></header>
      <div className="comparison-position-grid">
        <div><span>{leftName}</span><strong>{leftAi?.market?.market_position?.quadrant || '-'}</strong><small>위험 {leftAi?.market?.current_risk_label || '-'} · 적합도 {leftAi?.market?.startup_fit_label || '-'}</small></div>
        <div><span>{rightName}</span><strong>{rightAi?.market?.market_position?.quadrant || '-'}</strong><small>위험 {rightAi?.market?.current_risk_label || '-'} · 적합도 {rightAi?.market?.startup_fit_label || '-'}</small></div>
      </div>
    </article>
  )
}
