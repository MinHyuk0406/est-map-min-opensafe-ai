import { RISK_LEVELS } from '../../utils/dataProcessor'

export default function MapLegend() {
  return (
    <div className="map-legend" aria-label="폐업 위험도 범례">
      <strong>폐업 위험도</strong>
      {RISK_LEVELS.map((level) => (
        <div className="legend-item" key={level.key}>
          <span className="legend-swatch" style={{ backgroundColor: level.color }} />
          <span>{level.label}</span>
        </div>
      ))}
    </div>
  )
}
