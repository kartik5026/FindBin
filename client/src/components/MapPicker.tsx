import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'

type LatLng = { lat: number; lng: number }

export function MapPicker(props: {
  value: LatLng | null
  onChange: (next: LatLng) => void
  initialCenter: LatLng
  zoom?: number
  height?: number
}) {
  const mapDivRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  const zoom = props.zoom ?? 16
  const height = props.height ?? 280

  const markerIcon = useMemo(() => {
    return L.divIcon({
      className: '',
      html:
        '<div style="width:16px;height:16px;border-radius:999px;background:#111827;border:2px solid #ffffff;box-shadow:0 8px 18px rgba(17,24,39,.25)"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })
  }, [])

  useEffect(() => {
    if (!mapDivRef.current) return
    if (mapRef.current) return

    const map = L.map(mapDivRef.current, {
      center: [props.initialCenter.lat, props.initialCenter.lng],
      zoom,
      zoomControl: true,
    })
    mapRef.current = map

    // Normal Leaflet map (OpenStreetMap standard tiles)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    const initial = props.value ?? props.initialCenter
    const marker = L.marker([initial.lat, initial.lng], { icon: markerIcon }).addTo(map)
    markerRef.current = marker

    map.on('click', (e: L.LeafletMouseEvent) => {
      const next = { lat: e.latlng.lat, lng: e.latlng.lng }
      marker.setLatLng([next.lat, next.lng])
      props.onChange(next)
    })

    return () => {
      map.off()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep marker in sync when lat/lng changes via inputs/geolocation
  useEffect(() => {
    if (!props.value) return
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return
    marker.setLatLng([props.value.lat, props.value.lng])
  }, [props.value?.lat, props.value?.lng])

  // If value appears and it's far away, recenter (nice UX)
  useEffect(() => {
    if (!props.value) return
    const map = mapRef.current
    if (!map) return
    map.setView([props.value.lat, props.value.lng], map.getZoom(), { animate: true })
  }, [props.value?.lat, props.value?.lng])

  return (
    <div
      ref={mapDivRef}
      style={{
        width: '100%',
        height,
        borderRadius: 14,
        border: '1px solid rgba(17,24,39,0.12)',
        overflow: 'hidden',
      }}
    />
  )
}


