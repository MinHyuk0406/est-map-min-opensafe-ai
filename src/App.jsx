import { useEffect, useMemo, useState } from 'react'
import Header from './components/Header'
import SeoulMap from './components/SeoulMap'
import DongDetailPanel from './components/DongDetailPanel'
import { DATA_PATHS } from './config/dataPaths'
import { fetchJson } from './services/staticDataService'
import {
  ALL_INDUSTRIES,
  ANALYSIS_MODES,
  getIndustryNames,
} from './utils/dataProcessor'

export default function App() {
  const [selectedQuarter, setSelectedQuarter] = useState('20251')
  const [selectedIndustry, setSelectedIndustry] = useState(ALL_INDUSTRIES)
  const [analysisMode, setAnalysisMode] = useState(ANALYSIS_MODES.CLOSURE_RATE)
  const [selectedDongCode, setSelectedDongCode] = useState(null)
  const [processed, setProcessed] = useState(null)
  const [marketContext, setMarketContext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState('')
  const [contextError, setContextError] = useState('')

  useEffect(() => {
    Promise.allSettled([
      fetchJson(DATA_PATHS.stores, '점포 분석 데이터'),
      fetchJson(DATA_PATHS.marketContext, '매출·인구 데이터'),
    ]).then(([storeResult, contextResult]) => {
      if (storeResult.status === 'fulfilled') setProcessed(storeResult.value)
      else setDataError('점포 데이터를 불러오지 못했습니다.')
      if (contextResult.status === 'fulfilled') setMarketContext(contextResult.value)
      else setContextError('매출·인구 데이터를 불러오지 못했습니다.')
    }).finally(() => setLoading(false))
  }, [])

  const industries = useMemo(() => getIndustryNames(processed), [processed])

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
      {loading ? (
        <div className="app-loading"><span className="loading-spinner" />상권 데이터를 불러오는 중입니다...</div>
      ) : dataError ? (
        <div className="data-error">{dataError}</div>
      ) : (
        <main className="app-main">
          <SeoulMap
            quarter={selectedQuarter}
            industry={selectedIndustry}
            analysisMode={analysisMode}
            processed={processed}
            selectedDongCode={selectedDongCode}
            onSelectDong={setSelectedDongCode}
          />
          <DongDetailPanel
            dongCode={selectedDongCode}
            quarter={selectedQuarter}
            industry={selectedIndustry}
            analysisMode={analysisMode}
            processed={processed}
            marketContext={marketContext}
            contextError={contextError}
          />
        </main>
      )}
    </div>
  )
}
