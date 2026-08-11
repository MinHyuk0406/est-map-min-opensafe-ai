const QUARTERS = ['2025 Q1', '2025 Q2', '2025 Q3', '2025 Q4']

export default function FilterBar({
  selectedQuarter,
  onQuarterChange,
  selectedIndustry,
  onIndustryChange,
  industries,
}) {
  return (
    <div className="filter-bar" aria-label="데이터 필터">
      <label className="filter-field">
        <span>기준 분기</span>
        <select value={selectedQuarter} onChange={(event) => onQuarterChange(event.target.value)}>
          {QUARTERS.map((quarter) => <option key={quarter}>{quarter}</option>)}
        </select>
      </label>
      <label className="filter-field industry-filter">
        <span>업종</span>
        <select value={selectedIndustry} onChange={(event) => onIndustryChange(event.target.value)}>
          {industries.map((industry) => <option key={industry}>{industry}</option>)}
        </select>
      </label>
    </div>
  )
}
