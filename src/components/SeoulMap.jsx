import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  ANALYSIS_MODES,
  MIN_STORE_COUNT,
  MODE_STYLES,
  computeAnalysisThresholds,
  formatAnalysisValue,
  getAnalysisDataset,
  getAnalysisLevel,
  getAnalysisValue,
  getDongRanking,
  getDongStats,
  getMarketTypeData,
  getPreviousQuarter,
  quarterLabelToCode,
} from '../utils/dataProcessor'
import MapLegend from './MapLegend'
import RankingPanel from './RankingPanel'
import { DATA_PATHS } from '../config/dataPaths'
import { fetchJson } from '../services/staticDataService'

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
  analysisMode,
  processed,
  selectedDongCode,
  onSelectDong,
}) {
  const [geoData, setGeoData] = useState(null)
  const [geoError, setGeoError] = useState('')
  const geoJsonRef = useRef(null)
  const mapRef = useRef(null)
  const styleRef = useRef(() => EMPTY_STYLE)
  const tooltipRef = useRef(() => '')
  const selectedCodeRef = useRef(selectedDongCode)
  const quarterCode = quarterLabelToCode(quarter)

  useEffect(() => {
    fetchJson(DATA_PATHS.geojson, '서울 행정동 경계 데이터')
      .then(setGeoData)
      .catch((error) => setGeoError(error.message))
  }, [])

  const dataset = useMemo(
    () => getAnalysisDataset(processed, quarterCode, industry, analysisMode),
    [processed, quarterCode, industry, analysisMode],
  )
  const values = useMemo(
    () => dataset.map((row) => row.value).filter(Number.isFinite),
    [dataset],
  )
  const thresholds = useMemo(
    () => computeAnalysisThresholds(values, analysisMode),
    [values, analysisMode],
  )
  const ranking = useMemo(
    () => getDongRanking(processed, quarterCode, industry, analysisMode),
    [processed, quarterCode, industry, analysisMode],
  )
  const marketTypeData = useMemo(
    () => getMarketTypeData(processed, quarterCode, industry),
    [processed, quarterCode, industry],
  )
  const marketTypeByCode = useMemo(
    () => new Map(marketTypeData.points.map((point) => [point.code, point])),
    [marketTypeData],
  )
  const selectedMapInfo = useMemo(() => {
    if (!geoData || !selectedDongCode) return null
    const feature = geoData.features.find((item) => String(item.properties?.ADSTRD_CD) === String(selectedDongCode))
    if (!feature) return null
    const item = processed?.[selectedDongCode]
    return {
      center: L.geoJSON(feature).getBounds().getCenter(),
      name: item?.name || '행정동 정보 없음',
      stats: getDongStats(item, quarterCode, industry),
      marketType: marketTypeByCode.get(selectedDongCode) || null,
    }
  }, [geoData, selectedDongCode, processed, quarterCode, industry, marketTypeByCode])
  const previousQuarter = getPreviousQuarter(quarterCode)
  const previousDataAvailable = useMemo(
    () => Object.values(processed || {}).some((item) => getDongStats(item, previousQuarter, industry)),
    [processed, previousQuarter, industry],
  )
  const changeUnavailable = analysisMode === ANALYSIS_MODES.CLOSURE_CHANGE && !previousDataAvailable

  function getFeatureInfo(feature) {
    const code = String(feature.properties?.ADSTRD_CD || '')
    const item = processed?.[code]
    return {
      code,
      item,
      name: item?.name || '행정동 정보 없음',
      stats: getDongStats(item, quarterCode, industry),
      value: getAnalysisValue(item, quarterCode, industry, analysisMode),
      marketType: marketTypeByCode.get(code) || null,
    }
  }

  function styleFeature(feature) {
    const { code, value, marketType } = getFeatureInfo(feature)
    const level = analysisMode === ANALYSIS_MODES.MARKET_TYPE
      ? MODE_STYLES[ANALYSIS_MODES.MARKET_TYPE].levels.find((item) => item.key === marketType?.key)
      : getAnalysisLevel(value, thresholds, analysisMode)
    if (!level) return EMPTY_STYLE
    const selected = code === selectedDongCode
    return {
      color: selected ? '#202a26' : '#ffffff',
      fillColor: level.color,
      weight: selected ? 3 : 1,
      fillOpacity: selected ? 0.9 : 0.72,
    }
  }

  function buildTooltip(feature) {
    const { name, stats, value, marketType } = getFeatureInfo(feature)
    if (analysisMode === ANALYSIS_MODES.MARKET_TYPE) {
      if (!marketType) {
        const reason = stats && stats['점포_수'] < MIN_STORE_COUNT ? `표본 부족 · 점포 ${stats['점포_수']}개` : '데이터 없음'
        return `<strong>${name}</strong><span>${reason}</span>`
      }
      return `<strong>${name}</strong><span>${marketType.label}</span><span>개업률 ${marketType.openRate.toFixed(2)}% · 폐업률 ${marketType.closureRate.toFixed(2)}%</span>`
    }
    if (!Number.isFinite(value)) return `<strong>${name}</strong><span>데이터 없음</span>`
    if (analysisMode === ANALYSIS_MODES.CLOSURE_RATE) {
      return `<strong>${name}</strong><span>폐업률 ${formatAnalysisValue(value, analysisMode)}</span><span>폐업 점포 ${Number(stats['폐업_점포_수']).toLocaleString('ko-KR')}개</span>`
    }
    if (analysisMode === ANALYSIS_MODES.CLOSURE_CHANGE) {
      return `<strong>${name}</strong><span>폐업률 변화 ${formatAnalysisValue(value, analysisMode)}</span><span>전분기 폐업률과의 차이</span>`
    }
    return `<strong>${name}</strong><span>개폐업 순증감 ${formatAnalysisValue(value, analysisMode)}</span><span>개업 ${stats['개업_점포_수'].toLocaleString('ko-KR')}개 · 폐업 ${stats['폐업_점포_수'].toLocaleString('ko-KR')}개</span>`
  }

  styleRef.current = styleFeature
  tooltipRef.current = buildTooltip
  selectedCodeRef.current = selectedDongCode

  useEffect(() => {
    const layerGroup = geoJsonRef.current
    if (!layerGroup) return
    layerGroup.eachLayer((layer) => {
      layer.setStyle(styleRef.current(layer.feature))
      layer.setTooltipContent(tooltipRef.current(layer.feature))
      if (String(layer.feature?.properties?.ADSTRD_CD) === String(selectedDongCode)) layer.closeTooltip()
    })
  }, [analysisMode, industry, quarterCode, selectedDongCode, thresholds])

  function onEachFeature(feature, layer) {
    const code = String(feature.properties?.ADSTRD_CD || '')
    layer.bindTooltip(tooltipRef.current(feature), {
      className: 'dong-tooltip',
      sticky: true,
      direction: 'top',
    })
    layer.on({
      mouseover: () => {
        if (selectedCodeRef.current === code) layer.closeTooltip()
        layer.setStyle({ color: '#26322d', weight: 3, fillOpacity: 0.86 })
      },
      mouseout: () => layer.setStyle(styleRef.current(feature)),
      click: () => {
        layer.closeTooltip()
        onSelectDong(code)
      },
    })
  }

  function handleRankingSelect(code) {
    onSelectDong(code)
    const feature = geoData?.features.find(
      (item) => String(item.properties?.ADSTRD_CD) === String(code),
    )
    if (!feature || !mapRef.current) return
    const bounds = L.geoJSON(feature).getBounds()
    if (bounds.isValid()) {
      mapRef.current.flyToBounds(bounds, { padding: [90, 90], maxZoom: 14, duration: 0.65 })
    }
  }

  if (geoError) return <section className="map-wrap map-message">{geoError}</section>

  return (
    <section className="map-wrap" aria-label="서울 행정동 폐업 변화 지도">
      <MapContainer ref={mapRef} center={[37.5665, 126.978]} zoom={11} className="seoul-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoData && processed && (
          <GeoJSON
            ref={geoJsonRef}
            data={geoData}
            style={(feature) => styleRef.current(feature)}
            onEachFeature={onEachFeature}
          />
        )}
        {selectedMapInfo && (
          <CircleMarker
            center={selectedMapInfo.center}
            radius={5}
            pathOptions={{ color: '#ffffff', fillColor: '#172d24', fillOpacity: 1, weight: 2 }}
          >
            <Tooltip permanent direction="top" offset={[0, -7]} className="selected-dong-label">
              <strong>{selectedMapInfo.name}</strong>
              {selectedMapInfo.stats && <span>폐업률 {selectedMapInfo.stats['폐업_률'].toFixed(2)}%</span>}
              {selectedMapInfo.marketType && <span>시장 유형 · {selectedMapInfo.marketType.label}</span>}
            </Tooltip>
          </CircleMarker>
        )}
        <FitSeoulBounds geoData={geoData} />
      </MapContainer>
      {!geoData && <div className="map-loading">지도를 불러오는 중입니다</div>}
      <RankingPanel
        mode={analysisMode}
        ranking={ranking}
        distribution={marketTypeData.distribution}
        selectedDongCode={selectedDongCode}
        onSelectDong={handleRankingSelect}
        unavailable={changeUnavailable}
      />
      <MapLegend mode={analysisMode} thresholds={thresholds} />
    </section>
  )
}
