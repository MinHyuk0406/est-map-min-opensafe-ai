const shapefile = require('shapefile')
const fs = require('fs')
const path = require('path')
const iconv = require('iconv-lite')
const Papa = require('papaparse')
const proj4 = require('proj4')

const DATA_DIR = path.join(__dirname, '../src/data')

function findDataFile(extension) {
  const file = fs.readdirSync(DATA_DIR).find((name) => name.toLowerCase().endsWith(extension))
  if (!file) throw new Error(`${extension} 데이터 파일을 찾을 수 없습니다.`)
  return path.join(DATA_DIR, file)
}

async function shpToGeojson() {
  const shpPath = findDataFile('.shp')
  const dbfPath = findDataFile('.dbf')
  const outPath = path.join(DATA_DIR, 'seoul_dong.geojson')
  const source = await shapefile.open(shpPath, dbfPath, { encoding: 'euc-kr' })
  const features = []
  const fromDef = '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs'
  const toDef = '+proj=longlat +datum=WGS84 +no_defs'

  function transformCoords(coords) {
    if (typeof coords[0] === 'number') return proj4(fromDef, toDef, coords)
    return coords.map(transformCoords)
  }

  let result = await source.read()
  while (!result.done) {
    features.push({
      type: 'Feature',
      geometry: { ...result.value.geometry, coordinates: transformCoords(result.value.geometry.coordinates) },
      properties: result.value.properties,
    })
    result = await source.read()
  }

  fs.writeFileSync(outPath, JSON.stringify({ type: 'FeatureCollection', features }, null, 2), 'utf8')
  console.log('Wrote UTF-8 GeoJSON:', outPath)
}

function parseCsvToJson() {
  const csvPath = findDataFile('.csv')
  const outRows = path.join(DATA_DIR, 'rows_parsed.json')
  const outByDong = path.join(DATA_DIR, 'processed_by_dong.json')
  const text = iconv.decode(fs.readFileSync(csvPath), 'euc-kr')
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
  if (parsed.errors.length) throw new Error(parsed.errors[0].message)

  const rows = parsed.data
  fs.writeFileSync(outRows, JSON.stringify(rows, null, 2), 'utf8')
  const byDong = {}

  rows.forEach((row) => {
    const quarter = row['기준_년분기_코드']
    const dongCode = row['행정동_코드']
    const dongName = row['행정동_코드_명']
    const stores = Number(row['점포_수']) || 0
    const closed = Number(row['폐업_점포_수']) || 0
    const opened = Number(row['개업_점포_수']) || 0
    const industry = row['서비스_업종_코드_명']
    if (!dongCode || !quarter || !industry) return

    if (!byDong[dongCode]) byDong[dongCode] = { name: dongName, quarters: {}, industries: {} }
    if (!byDong[dongCode].quarters[quarter]) {
      byDong[dongCode].quarters[quarter] = { '점포_수': 0, '폐업_점포_수': 0, '개업_점포_수': 0 }
    }
    const quarterStats = byDong[dongCode].quarters[quarter]
    quarterStats['점포_수'] += stores
    quarterStats['폐업_점포_수'] += closed
    quarterStats['개업_점포_수'] += opened

    if (!byDong[dongCode].industries[quarter]) byDong[dongCode].industries[quarter] = {}
    if (!byDong[dongCode].industries[quarter][industry]) {
      byDong[dongCode].industries[quarter][industry] = { '점포_수': 0, '폐업_점포_수': 0 }
    }
    const industryStats = byDong[dongCode].industries[quarter][industry]
    industryStats['점포_수'] += stores
    industryStats['폐업_점포_수'] += closed
  })

  Object.values(byDong).forEach((item) => {
    Object.values(item.quarters).forEach((stats) => {
      stats['폐업_률'] = stats['점포_수'] ? (stats['폐업_점포_수'] / stats['점포_수']) * 100 : 0
    })
  })

  fs.writeFileSync(outByDong, JSON.stringify(byDong, null, 2), 'utf8')
  console.log('Wrote UTF-8 JSON:', outRows, outByDong)
}

async function main() {
  await shpToGeojson()
  parseCsvToJson()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
