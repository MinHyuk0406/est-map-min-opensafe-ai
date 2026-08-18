const WIDTH = 400
const HEIGHT = 280
const CENTER_X = 212
const CENTER_Y = 126

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function getPosition(openRate, closureRate, averages) {
  return {
    x: clamp(CENTER_X + ((openRate - averages.openRate) / Math.max(averages.openRate, 0.1)) * 150, 54, 372),
    y: clamp(CENTER_Y - ((closureRate - averages.closureRate) / Math.max(averages.closureRate, 0.1)) * 92, 27, 225),
  }
}

export default function MarketQuadrant({
  marketType,
  averages,
  points = [],
  selectedDongCode,
  selectedDongName,
}) {
  if (!marketType || !averages) return null
  const selected = getPosition(marketType.openRate, marketType.closureRate, averages)
  const labelOnLeft = selected.x > 285

  return (
    <div className="quadrant-wrap">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="quadrant-chart" role="img" aria-label={`개업률과 폐업률 기준 ${marketType.label}`}>
        <rect x="44" y="18" width="328" height="216" className="quadrant-bg" />
        <line x1={CENTER_X} x2={CENTER_X} y1="18" y2="234" className="quadrant-axis" />
        <line x1="44" x2="372" y1={CENTER_Y} y2={CENTER_Y} className="quadrant-axis" />
        <text x="125" y="39" textAnchor="middle" className="quadrant-type-label">저진입·고폐업</text>
        <text x="293" y="39" textAnchor="middle" className="quadrant-type-label">고경쟁·고회전</text>
        <text x="125" y="218" textAnchor="middle" className="quadrant-type-label">안정 유지</text>
        <text x="293" y="218" textAnchor="middle" className="quadrant-type-label">진입활발·저폐업</text>
        {points.filter((point) => point.code !== selectedDongCode).map((point) => {
          const position = getPosition(point.openRate, point.closureRate, averages)
          return (
            <circle key={point.code} cx={position.x} cy={position.y} r="2.5" className="quadrant-peer-point">
              <title>{`${point.name}\n개업률 ${point.openRate.toFixed(2)}%\n폐업률 ${point.closureRate.toFixed(2)}%`}</title>
            </circle>
          )
        })}
        <circle cx={selected.x} cy={selected.y} r="8" className="quadrant-point">
          <title>{`${selectedDongName}\n개업률 ${marketType.openRate.toFixed(2)}%\n폐업률 ${marketType.closureRate.toFixed(2)}%`}</title>
        </circle>
        <text
          x={selected.x + (labelOnLeft ? -12 : 12)}
          y={selected.y - 11}
          textAnchor={labelOnLeft ? 'end' : 'start'}
          className="quadrant-selected-label"
        >
          {selectedDongName}
        </text>
        <text x={CENTER_X} y="270" textAnchor="middle" className="quadrant-axis-title">개업률 높음 →</text>
        <text x="14" y={CENTER_Y} textAnchor="middle" className="quadrant-axis-title" transform={`rotate(-90 14 ${CENTER_Y})`}>폐업률 높음 →</text>
        <text x={CENTER_X + 5} y="251" className="quadrant-average-label">서울 개업률 {averages.openRate.toFixed(2)}%</text>
        <text x="49" y={CENTER_Y - 6} className="quadrant-average-label">서울 폐업률 {averages.closureRate.toFixed(2)}%</text>
      </svg>
    </div>
  )
}
