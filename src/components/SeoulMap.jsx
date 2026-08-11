import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  RISK_LEVELS,
  computeQuantileBuckets,
  getDongStats,
  getRiskLevel,
  quarterLabelToCode,
} from '../utils/dataProcessor'
import MapLegend from './MapLegend'

const EMPTY_STYLE = { color: '#9aa4a0', fillColor: '#e7ebe9', weight: 1, fillOpacity: 0.55 }

function FitSeoulBounds({ geoData }) {
  const map = useMap()

  useEffect(() => {
    if (!geoData) return
    const bounds = L.geoJSON(geoData).getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [22, 22] })
  }, [geoData, map])

  return null
}

export default function SeoulMap({
  quarter,
  industry,
  processed,
  selectedDongCode,
  onSelectDong,
}) {
  const [geoData, setGeoData] = useState(null)
  const [geoError, setGeoError] = useState('')
  const geoJsonRef = useRef(null)
  const quarterCode = quarterLabelToCode(quarter)

  useEffect(() => {
    fetch('/src/data/seoul_dong.geojson')
      .then((response) => {
        if (!response.ok) throw new Error('지도 경계 데이터를 불러오지 못했습니다.')
        return response.json()
      })
      .then(setGeoData)
      .catch((error) => setGeoError(error.message))
  }, [])

  const rates = useMemo(() => Object.values(processed || {})
    .map((item) => getDongStats(item, quarterCode, industry)?.['폐업_률'])
    .filter(Number.isFinite), [processed, quarterCode, industry])

  const thresholds = useMemo(() => computeQuantileBuckets(rates, 4), [rates])

  function getFeatureInfo(feature) {
    const code = String(feature.properties?.ADSTRD_CD || '')
    const item = processed?.[code]
    return { code, item, name: item?.name || '행정동 정보 없음', stats: getDongStats(item, quarterCode, industry) }
  }

  function styleFeature(feature) {
    const { code, stats } = getFeatureInfo(feature)
    const risk = getRiskLevel(stats?.['폐업_률'], thresholds)
    if (!risk) return EMPTY_STYLE
    const selected = code === selectedDongCode
    return {
      color: selected ? '#202a26' : '#ffffff',
      fillColor: risk.color,
      weight: selected ? 3 : 1,
      fillOpacity: selected ? 0.9 : 0.72,
    }
  }

  function onEachFeature(feature, layer) {
    const { code, name, stats } = getFeatureInfo(feature)
    const rate = stats?.['폐업_률']
    const closed = stats?.['폐업_점포_수']
    const tooltip = stats
      ? `<strong>${name}</strong><span>폐업률 ${rate.toFixed(1)}%</span><span>폐업 점포 ${Number(closed).toLocaleString('ko-KR')}개</span>`
      : `<strong>${name}</strong><span>데이터 없음</span>`

    layer.bindTooltip(tooltip, { className: 'dong-tooltip', sticky: true, direction: 'top' })
    layer.on({
      mouseover: () => layer.setStyle({ color: '#26322d', weight: 3, fillOpacity: 0.86 }),
      mouseout: () => geoJsonRef.current?.resetStyle(layer),
      click: () => onSelectDong(code),
    })
  }

  if (geoError) return <section className="map-wrap map-message">{geoError}</section>

  return (
    <section className="map-wrap" aria-label="서울 행정동 폐업 위험도 지도">
      <MapContainer center={[37.5665, 126.978]} zoom={11} className="seoul-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoData && processed && (
          <GeoJSON
            key={`${quarter}-${industry}-${selectedDongCode || 'none'}`}
            ref={geoJsonRef}
            data={geoData}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
        <FitSeoulBounds geoData={geoData} />
      </MapContainer>
      {!geoData && <div className="map-loading">지도를 불러오는 중입니다</div>}
      <MapLegend levels={RISK_LEVELS} />
    </section>
  )
}
