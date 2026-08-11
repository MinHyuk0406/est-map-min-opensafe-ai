import { useState } from 'react'
import { ANALYSIS_MODES, MODE_STYLES, formatLegendBoundary } from '../utils/dataProcessor'

function getRangeLabel(index, thresholds, mode) {
  if (mode === ANALYSIS_MODES.MARKET_TYPE || thresholds.length < 3) return ''
  if (index === 0) return `${formatLegendBoundary(thresholds[0], mode)} 이하`
  if (index === 3) return `${formatLegendBoundary(thresholds[2], mode)} 초과`
  return `${formatLegendBoundary(thresholds[index], mode)} 이하`
}

export default function MapLegend({ mode, thresholds }) {
  const [open, setOpen] = useState(false)
  const config = MODE_STYLES[mode]
  return (
    <div className={`map-legend-control ${open ? 'open' : ''}`} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        색상 기준 <span aria-hidden="true">ⓘ</span>
      </button>
      <div className="map-legend" aria-label={`${config.title} 범례`}>
        <strong>{config.title}</strong>
        {config.levels.map((level, index) => (
          <div className="legend-item" key={level.key}>
            <span className="legend-swatch" style={{ backgroundColor: level.color }} />
            <span className="legend-copy"><b>{level.label}</b><small>{getRangeLabel(index, thresholds, mode)}</small></span>
          </div>
        ))}
        <p>{mode === ANALYSIS_MODES.MARKET_TYPE ? '선택 조건의 서울 가중 기준' : '서울 행정동 상대 분포 기준'}</p>
      </div>
    </div>
  )
}
