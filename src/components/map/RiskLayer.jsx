import { useMemo, useRef } from 'react'
import { GeoJSON } from 'react-leaflet'
import {
  computeQuantileBuckets,
  getDongStats,
  getRiskLevel,
  quarterLabelToCode,
} from '../../utils/dataProcessor'

const EMPTY_STYLE = { color: 'transparent', fillColor: '#e7ebe9', weight: 0, fillOpacity: 0.55 }

export default function RiskLayer({
  geoData,
  processed,
  quarter,
  industry,
  selectedDongCode,
  zoom,
  locationsVisible,
  onSelectDong,
}) {
  const geoJsonRef = useRef(null)
  const quarterCode = quarterLabelToCode(quarter)
  const rates = useMemo(() => Object.values(processed || {})
    .map((item) => getDongStats(item, quarterCode, industry)?.['폐업_률'])
    .filter(Number.isFinite), [processed, quarterCode, industry])
  const thresholds = useMemo(() => computeQuantileBuckets(rates, 4), [rates])

  function getFeatureInfo(feature) {
    const code = String(feature.properties?.ADSTRD_CD || '')
    const item = processed?.[code]
    return {
      code,
      name: item?.name || '행정동 정보 없음',
      stats: getDongStats(item, quarterCode, industry),
    }
  }

  function styleFeature(feature) {
    const { code, stats } = getFeatureInfo(feature)
    const risk = getRiskLevel(stats?.['폐업_률'], thresholds)
    if (!risk) return EMPTY_STYLE

    const selected = code === selectedDongCode
    // Keep the categories readable under markers; only reduce opacity instead of removing the fill.
    const dimForLocations = locationsVisible && zoom >= 14
    return {
      color: selected ? '#225f49' : 'transparent',
      fillColor: risk.color,
      weight: selected ? 3 : 0,
      opacity: selected ? 1 : 0,
      fillOpacity: dimForLocations ? (selected ? 0.7 : 0.42) : (selected ? 0.9 : 0.72),
    }
  }

  function bindFeature(feature, layer) {
    const { code, name, stats } = getFeatureInfo(feature)
    const tooltip = stats
      ? `<strong>${name}</strong><span>폐업률 ${stats['폐업_률'].toFixed(1)}%</span><span>폐업 점포 ${Number(stats['폐업_점포_수']).toLocaleString('ko-KR')}개</span>`
      : `<strong>${name}</strong><span>데이터 없음</span>`

    layer.bindTooltip(tooltip, { className: 'dong-tooltip', sticky: true, direction: 'top' })
    layer.on({
      mouseover: () => layer.setStyle({
        color: 'transparent',
        weight: 0,
        fillOpacity: locationsVisible && zoom >= 14 ? 0.62 : 0.86,
      }),
      mouseout: () => geoJsonRef.current?.resetStyle(layer),
      click: () => onSelectDong(code),
    })
  }

  return (
    <GeoJSON
      key={`${quarter}-${industry}-${selectedDongCode || 'none'}-${locationsVisible && zoom >= 14 ? 'dimmed' : 'filled'}`}
      ref={geoJsonRef}
      data={geoData}
      style={styleFeature}
      onEachFeature={bindFeature}
    />
  )
}
