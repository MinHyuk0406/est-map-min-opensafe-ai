import FilterBar from './FilterBar'

export default function Header(props) {
  return (
    <header className="app-header">
      <div className="brand-block">
        <h1>서울 상권 폐업 지도</h1>
        <p>서울시 행정동별 폐업 데이터를 한눈에 확인하세요</p>
      </div>
      <FilterBar {...props} />
    </header>
  )
}
