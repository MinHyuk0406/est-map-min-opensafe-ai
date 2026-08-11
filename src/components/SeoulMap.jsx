import { useCallback, useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import useSeoulMapData from '../hooks/useSeoulMapData'
import { quarterLabelToCode } from '../utils/dataProcessor'
import ClosureLocationLayer from './map/ClosureLocationLayer'
import DistrictBoundaryLayer from './map/DistrictBoundaryLayer'
import MapLayerControls from './map/MapLayerControls'
import MapLegend from './map/MapLegend'
import RiskLayer from './map/RiskLayer'

const INITIAL_LAYERS = { risk: true, closures: true }

function FitSeoulBounds({ geoData }) {
  const map = useMap()

  useEffect(() => {
    if (!geoData) return
    const bounds = L.geoJSON(geoData).getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [22, 22] })
  }, [geoData, map])

  return null
}

function MapZoomReporter({ onZoomChange }) {
  const map = useMap()

  useEffect(() => {
    const reportZoom = () => onZoomChange(map.getZoom())
    reportZoom()
    map.on('zoomend', reportZoom)
    return () => map.off('zoomend', reportZoom)
  }, [map, onZoomChange])

  return null
}

export default function SeoulMap({
  quarter,
  industry,
  processed,
  selectedDongCode,
  selectedDistrict,
  onSelectDong,
  onSelectClosureDong,
  onSelectDistrict,
}) {
  const [visibleLayers, setVisibleLayers] = useState(INITIAL_LAYERS)
  const [hoveredDistrict, setHoveredDistrict] = useState(null)
  const [zoom, setZoom] = useState(11)
  const quarterCode = quarterLabelToCode(quarter)
  const year = quarterCode?.slice(0, 4)
  const { geoData, districtBoundaries, closureData, geoError, closureError } = useSeoulMapData(year)

  const closurePoints = useMemo(
    () => closureData?.quarters?.[quarterCode]?.points || [],
    [closureData, quarterCode],
  )
  const visibleClosurePoints = useMemo(() => {
    if (!selectedDistrict) return closurePoints
    return closurePoints.filter((point) => point.district === selectedDistrict)
  }, [closurePoints, selectedDistrict])

  const handleZoomChange = useCallback((nextZoom) => {
    setZoom(nextZoom)
    if (nextZoom < 13) onSelectDistrict(null)
  }, [onSelectDistrict])

  function toggleLayer(layerName) {
    setVisibleLayers((current) => ({ ...current, [layerName]: !current[layerName] }))
    if (layerName === 'closures') setHoveredDistrict(null)
  }

  if (geoError) return <section className="map-wrap map-message">{geoError}</section>

  const activeDistrict = hoveredDistrict || selectedDistrict
  const showBoundaries = visibleLayers.risk || visibleLayers.closures

  return (
    <section className="map-wrap" aria-label="서울 폐업 위험도 및 위치 지도">
      <MapContainer center={[37.5665, 126.978]} zoom={11} className="seoul-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {visibleLayers.risk && geoData && processed && (
          <RiskLayer
            geoData={geoData}
            processed={processed}
            quarter={quarter}
            industry={industry}
            selectedDongCode={selectedDongCode}
            zoom={zoom}
            locationsVisible={visibleLayers.closures}
            onSelectDong={onSelectDong}
          />
        )}

        {showBoundaries && (
          <DistrictBoundaryLayer
            boundaries={districtBoundaries}
            activeDistrict={activeDistrict}
          />
        )}

        {visibleLayers.closures && visibleClosurePoints.length > 0 && (
          <ClosureLocationLayer
            points={visibleClosurePoints}
            selectedDistrict={selectedDistrict}
            onHoverDistrict={setHoveredDistrict}
            onSelectDong={onSelectClosureDong}
            onSelectDistrict={onSelectDistrict}
          />
        )}

        <FitSeoulBounds geoData={geoData} />
        <MapZoomReporter onZoomChange={handleZoomChange} />
      </MapContainer>

      {!geoData && <div className="map-loading">지도를 불러오는 중입니다</div>}
      <MapLayerControls visibleLayers={visibleLayers} onToggle={toggleLayer} />

      {visibleLayers.closures && (
        <div className={`closure-status${closureError ? ' is-error' : ''}`} aria-live="polite">
          <strong>{selectedDistrict ? `${selectedDistrict} 인허가 업소 폐업 위치` : '인허가 업소 폐업 위치'}</strong>
          {closureError ? (
            <span>{closureError}</span>
          ) : !closureData ? (
            <span>위치 데이터 준비 중</span>
          ) : (
            <span>
              {visibleClosurePoints.length.toLocaleString('ko-KR')}곳 · {!selectedDistrict
                ? '자치구별 묶음'
                : zoom < 15 ? '행정동별 묶음' : zoom < 16 ? '행정동 내 클러스터' : '개별 위치'}
            </span>
          )}
        </div>
      )}

      {visibleLayers.risk && <MapLegend />}
    </section>
  )
}
