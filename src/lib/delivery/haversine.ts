/**
 * Haversine great-circle distance between two lat/lng coordinates.
 * Returns the distance in miles.
 */
export function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3_958.8 // Earth radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Forward-geocode an address string using the OSM Nominatim API (free, no key).
 * Returns [lat, lng] or null if not found.
 */
export async function geocodeAddress(
  address: string,
): Promise<[number, number] | null> {
  try {
    const encoded = encodeURIComponent(address)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1&addressdetails=0`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CourseStudio/1.0 (delivery@coursestudio.co)' },
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.length) return null
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
  } catch {
    return null
  }
}
