export async function fetchJson(url, label) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error(`[staticData] ${label} loading failed`, { url, error })
    throw error
  }
}
