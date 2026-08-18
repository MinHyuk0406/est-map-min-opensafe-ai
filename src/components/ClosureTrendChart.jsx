import { useMemo, useState } from 'react'

const WIDTH = 320
const HEIGHT = 132
const PADDING = { top: 14, right: 12, bottom: 27, left: 32 }

export default function ClosureTrendChart({ data, valueKey = 'rate', metricLabel = '폐업률' }) {
  const [hovered, setHovered] = useState(null)
  const points = useMemo(() => {
    const rates = data.map((item) => item[valueKey]).filter(Number.isFinite)
    const maxRate = Math.max(1, ...rates)
    const chartWidth = WIDTH - PADDING.left - PADDING.right
    const chartHeight = HEIGHT - PADDING.top - PADDING.bottom
    return data.map((item, index) => ({
      ...item,
      x: PADDING.left + (chartWidth * index) / Math.max(data.length - 1, 1),
      value: item[valueKey],
      y: Number.isFinite(item[valueKey])
        ? PADDING.top + chartHeight - (item[valueKey] / maxRate) * chartHeight
        : null,
      maxRate,
    }))
  }, [data, valueKey])

  const segments = points.reduce((result, point) => {
    if (point.y == null) {
      result.push([])
    } else {
      result[result.length - 1].push(point)
    }
    return result
  }, [[]]).filter((segment) => segment.length > 1)
  const maxRate = points[0]?.maxRate || 1

  return (
    <div className="trend-chart-wrap">
      {hovered && (
        <div
          className="trend-tooltip"
          style={{
            left: `${Math.min(80, Math.max(20, (hovered.x / WIDTH) * 100))}%`,
            top: `${(hovered.y / HEIGHT) * 100}%`,
          }}
        >
          <strong>{hovered.label}</strong>
          <span>{metricLabel} {hovered.value.toFixed(2)}%</span>
        </div>
      )}
      <svg className="trend-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`2025년 분기별 ${metricLabel} 추이`}>
        {[0, 0.5, 1].map((ratio) => {
          const y = PADDING.top + (HEIGHT - PADDING.top - PADDING.bottom) * ratio
          const value = maxRate * (1 - ratio)
          return (
            <g key={ratio}>
              <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y} y2={y} className="chart-grid-line" />
              <text x={PADDING.left - 6} y={y + 3} textAnchor="end" className="chart-axis-label">{value.toFixed(1)}%</text>
            </g>
          )
        })}
        {segments.map((segment) => (
          <polyline
            key={`${segment[0].quarterCode}-${segment.at(-1).quarterCode}`}
            points={segment.map((point) => `${point.x},${point.y}`).join(' ')}
            className={`chart-line ${valueKey === 'openRate' ? 'open-rate' : ''}`}
          />
        ))}
        {points.map((point) => (
          <g key={point.quarterCode}>
            <text x={point.x} y={HEIGHT - 7} textAnchor="middle" className="chart-quarter-label">{point.shortLabel}</text>
            {point.y != null && (
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                className={`chart-point ${valueKey === 'openRate' ? 'open-rate' : ''}`}
                tabIndex="0"
                onMouseEnter={() => setHovered(point)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(point)}
                onBlur={() => setHovered(null)}
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
