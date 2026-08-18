import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header'
import SeoulMap from './components/SeoulMap'
import DongDetailPanel from './components/DongDetailPanel'
import { DATA_PATHS } from './config/dataPaths'
import {
  fetchJsonCached,
  mergeMarketContext,
  mergeProcessedData,
} from './services/staticDataService'
import {
  ALL_INDUSTRIES,
  ANALYSIS_MODES,
  getIndustryNames,
} from './utils/dataProcessor'

const AVAILABLE_QUARTERS = Object.freeze(['20251', '20252', '20253', '20254'])

export default function App() {
  const [selectedQuarter, setSelectedQuarter] = useState('20251')
  const [selectedIndustry, setSelectedIndustry] = useState(ALL_INDUSTRIES)
  const [analysisMode, setAnalysisMode] = useState(ANALYSIS_MODES.CLOSURE_RATE)
  const [selectedDongCode, setSelectedDongCode] = useState(null)
  const [selectedDistrict, setSelectedDistrict] = useState(null)
  const [processed, setProcessed] = useState({})
  const [marketContext, setMarketContext] = useState({})
  const [loadingQuarters, setLoadingQuarters] = useState(new Set())
  const [attemptedQuarters, setAttemptedQuarters] = useState(new Set())
  const [quarterErrors, setQuarterErrors] = useState({})
  const [contextErrors, setContextErrors] = useState({})
  const loadedStoreQuartersRef = useRef(new Set())
  const loadedContextQuartersRef = useRef(new Set())
  const inFlightQuartersRef = useRef(new Set())

  useEffect(() => {
    AVAILABLE_QUARTERS.forEach((quarterCode) => {
      const needsStores = !loadedStoreQuartersRef.current.has(quarterCode)
      const needsContext = !loadedContextQuartersRef.current.has(quarterCode)
      if ((!needsStores && !needsContext) || inFlightQuartersRef.current.has(quarterCode)) return

      inFlightQuartersRef.current.add(quarterCode)
      setLoadingQuarters((current) => new Set([...current, quarterCode]))
      const storeRequest = needsStores
        ? fetchJsonCached(DATA_PATHS.stores(quarterCode), `${quarterCode} 점포 분석 데이터`)
        : Promise.resolve(null)
      const contextRequest = needsContext
        ? fetchJsonCached(DATA_PATHS.marketContext(quarterCode), `${quarterCode} 매출·인구 데이터`)
        : Promise.resolve(null)

      Promise.allSettled([storeRequest, contextRequest]).then(([storeResult, contextResult]) => {
        if (storeResult.status === 'fulfilled') {
          if (storeResult.value) setProcessed((current) => mergeProcessedData(current, storeResult.value))
          loadedStoreQuartersRef.current.add(quarterCode)
          setQuarterErrors((current) => {
            const next = { ...current }
            delete next[quarterCode]
            return next
          })
        } else {
          setQuarterErrors((current) => ({ ...current, [quarterCode]: '해당 분기 분석 데이터가 없습니다.' }))
        }

        if (contextResult.status === 'fulfilled') {
          if (contextResult.value) setMarketContext((current) => mergeMarketContext(current, contextResult.value))
          loadedContextQuartersRef.current.add(quarterCode)
          setContextErrors((current) => {
            const next = { ...current }
            delete next[quarterCode]
            return next
          })
        } else {
          setContextErrors((current) => ({ ...current, [quarterCode]: '해당 분기 매출·인구 데이터를 불러오지 못했습니다.' }))
        }
      }).finally(() => {
        inFlightQuartersRef.current.delete(quarterCode)
        setLoadingQuarters((current) => {
          const next = new Set(current)
          next.delete(quarterCode)
          return next
        })
        setAttemptedQuarters((current) => new Set([...current, quarterCode]))
      })
    })
  }, [])

  const industries = useMemo(() => getIndustryNames(processed), [processed])
  const initialLoadFinished = attemptedQuarters.has('20251')
  const requiredDataLoading = AVAILABLE_QUARTERS.some((quarter) => loadingQuarters.has(quarter))
  const selectedQuarterLabel = `${selectedQuarter.slice(0, 4)}년 ${selectedQuarter.slice(4)}분기`
  const selectedQuarterError = quarterErrors[selectedQuarter]
  const selectedContextError = contextErrors[selectedQuarter] || ''

  const handleSelectDong = useCallback((dongCode) => {
    setSelectedDistrict(null)
    setSelectedDongCode(dongCode)
  }, [])

  const handleSelectClosureDong = useCallback((dongCode) => {
    setSelectedDongCode(dongCode)
  }, [])

  const handleSelectDistrict = useCallback((districtName) => {
    setSelectedDongCode(null)
    setSelectedDistrict(districtName)
  }, [])

  return (
    <div className="app-root">
      <Header
        selectedQuarter={selectedQuarter}
        onQuarterChange={setSelectedQuarter}
        selectedIndustry={selectedIndustry}
        onIndustryChange={setSelectedIndustry}
        industries={industries}
        analysisMode={analysisMode}
        onAnalysisModeChange={setAnalysisMode}
      />
      {!initialLoadFinished ? (
        <div className="app-loading"><span className="loading-spinner" />상권 데이터를 불러오는 중입니다...</div>
      ) : (
        <main className="app-main">
          <SeoulMap
            quarter={selectedQuarter}
            industry={selectedIndustry}
            analysisMode={analysisMode}
            processed={processed}
            selectedDongCode={selectedDongCode}
            selectedDistrict={selectedDistrict}
            onSelectDong={handleSelectDong}
            onSelectClosureDong={handleSelectClosureDong}
            onSelectDistrict={handleSelectDistrict}
          />
          <DongDetailPanel
            dongCode={selectedDongCode}
            quarter={selectedQuarter}
            industry={selectedIndustry}
            analysisMode={analysisMode}
            processed={processed}
            marketContext={marketContext}
            contextError={selectedContextError}
          />
          {requiredDataLoading && (
            <div className="quarter-data-status loading"><span className="loading-spinner" />데이터를 불러오는 중입니다</div>
          )}
          {!requiredDataLoading && selectedQuarterError && (
            <div className="quarter-data-status error">{selectedQuarterLabel} · 데이터 없음</div>
          )}
        </main>
      )}
    </div>
  )
}
