import { apiGet } from './api'

export async function reverseGeocode(lat: number, lng: number): Promise<{
  displayName: string | null
  address: any | null
  cached?: boolean
}> {
  return await apiGet(`/api/geocode/reverse?lat=${lat}&lng=${lng}`)
}


