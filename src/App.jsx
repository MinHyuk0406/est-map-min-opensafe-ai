import { useEffect, useMemo, useState } from 'react'
import Header from './components/Header'
import SeoulMap from './components/SeoulMap'
import DongDetailPanel from './components/DongDetailPanel'
import { ALL_INDUSTRIES, getIndustryNames } from './utils/dataProcessor'

export default function App() {
  const [selectedQuarter, setSelectedQuarter] = useState('2025 Q1')
  const [selectedIndustry, setSelectedIndustry] = useState(ALL_INDUSTRIES)
  const [selectedDongCode, setSelectedDongCode] = useState(null)
  const [processed, setProcessed] = useState(null)
  const [dataError, setDataError] = useState('')

  useEffect(() => {
    fetch('/src/data/processed_by_dong.json')
      .then((response) => {
        if (!response.ok) throw new Error('데이터를 불러오지 못했습니다.')
        return response.json()
      })
      .then(setProcessed)
      .catch((error) => setDataError(error.message))
  }, [])

  const industries = useMemo(() => getIndustryNames(processed), [processed])

  function handleRecommendation(dongCode) {
    console.log('handleRecommendation', dongCode)
  }

  return (
    <div className="app-root">
      <Header
        selectedQuarter={selectedQuarter}
        onQuarterChange={setSelectedQuarter}
        selectedIndustry={selectedIndustry}
        onIndustryChange={setSelectedIndustry}
        industries={industries}
      />
      {dataError ? (
        <div className="data-error">{dataError}</div>
      ) : (
        <main className="app-main">
          <SeoulMap
            quarter={selectedQuarter}
            industry={selectedIndustry}
            processed={processed}
            selectedDongCode={selectedDongCode}
            onSelectDong={setSelectedDongCode}
          />
          <DongDetailPanel
            dongCode={selectedDongCode}
            quarter={selectedQuarter}
            industry={selectedIndustry}
            processed={processed}
            onRecommendation={handleRecommendation}
          />
        </main>
      )}
    </div>
  )
}
