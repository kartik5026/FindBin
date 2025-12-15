import '../App.css'
import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../api'
import { MapPicker } from '../components/MapPicker'
import { MapPickerModal } from '../components/MapPickerModal'
import { reverseGeocode } from '../geocode'
import { motion } from 'framer-motion'

export function UserPage() {
  const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'ready' | 'denied' | 'error'>('idle')
  const [isLocating, setIsLocating] = useState(false)
  const GPS_REQUIRED_MAX_ACCURACY_M = 200
  const [gpsGate, setGpsGate] = useState<
    'checking' | 'ok' | 'no_geolocation' | 'permission_denied' | 'low_accuracy' | 'error'
  >('checking')
  const [gpsAccuracyM, setGpsAccuracyM] = useState<number | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [nearest, setNearest] = useState<any>(null)
  const [nearestLoading, setNearestLoading] = useState(false)
  const [nearestError, setNearestError] = useState<string | null>(null)

  // request form
  const [reqEmail, setReqEmail] = useState('')
  const [reqAddress, setReqAddress] = useState('')
  const [reqNote, setReqNote] = useState('')
  const [reqLat, setReqLat] = useState<string>('')
  const [reqLng, setReqLng] = useState<string>('')
  const [reqMsg, setReqMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [reqAddrStatus, setReqAddrStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [reqAddrHint, setReqAddrHint] = useState<string>('')
  const [mapModalOpen, setMapModalOpen] = useState(false)

  const hasGeo = typeof navigator !== 'undefined' && !!navigator.geolocation

  const roundedCoords = useMemo(() => {
    if (!coords) return null
    return { lat: Number(coords.lat.toFixed(6)), lng: Number(coords.lng.toFixed(6)) }
  }, [coords])

  function requestLocation() {
    if (!hasGeo) {
      setGpsGate('no_geolocation')
      return
    }
    setGeoStatus('requesting')
    setIsLocating(true)
    setGpsGate('checking')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const accuracy = typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : null
        setGpsAccuracyM(accuracy)
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCoords(next)
        setReqLat((prev) => (prev.trim() ? prev : String(next.lat)))
        setReqLng((prev) => (prev.trim() ? prev : String(next.lng)))
        setGeoStatus('ready')
        setIsLocating(false)

        if (accuracy !== null && accuracy > GPS_REQUIRED_MAX_ACCURACY_M) setGpsGate('low_accuracy')
        else setGpsGate('ok')
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoStatus('denied')
          setGpsGate('permission_denied')
        } else {
          setGeoStatus('error')
          setGpsGate('error')
        }
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    if (!hasGeo) return
    if (geoStatus !== 'idle') return
    requestLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fillAddressFromLatLng(lat: number, lng: number) {
    setReqAddrStatus('loading')
    setReqAddrHint('')
    try {
      const data = await reverseGeocode(lat, lng)
      const name = data?.displayName ?? ''
      if (name) {
        setReqAddress((prev) => (prev.trim() ? prev : name))
        setReqAddrHint(name)
      } else {
        setReqAddrHint('No address found for this point.')
      }
      setReqAddrStatus('idle')
    } catch {
      setReqAddrStatus('error')
      setReqAddrHint('Could not fetch address. You can still type it manually.')
    }
  }

  useEffect(() => {
    async function run() {
      if (!coords) return
      setNearestLoading(true)
      setNearestError(null)
      try {
        const data = await apiGet<any>(`/api/dustbins/nearest?lat=${coords.lat}&lng=${coords.lng}`)
        setNearest(data)
      } catch (e: any) {
        setNearest(null)
        setNearestError(e?.message ?? 'Failed to load nearest dustbin')
      } finally {
        setNearestLoading(false)
      }
    }
    run()
  }, [coords])

  function openNavigation() {
    if (!coords) return
    const lat = nearest?.dustbin?.location?.coordinates?.[1]
    const lng = nearest?.dustbin?.location?.coordinates?.[0]
    if (typeof lat !== 'number' || typeof lng !== 'number') return
    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${encodeURIComponent(`${coords.lat},${coords.lng}`)}` +
      `&destination=${encodeURIComponent(`${lat},${lng}`)}` +
      `&travelmode=walking`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    setReqMsg(null)
    const lat = Number(reqLat)
    const lng = Number(reqLng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setReqMsg({ kind: 'err', text: 'Please select a valid location (lat/lng).' })
      return
    }
    try {
      await apiPost<any>('/api/dustbin-requests', {
        lat,
        lng,
        address: reqAddress,
        note: reqNote,
        email: reqEmail,
      })
      setReqMsg({ kind: 'ok', text: 'Request sent to admin for approval.' })
      setReqAddress('')
      setReqNote('')
    } catch (err: any) {
      setReqMsg({ kind: 'err', text: err?.message ?? 'Failed to submit request' })
    }
  }

  const currentReqLatLng =
    Number.isFinite(Number(reqLat)) && Number.isFinite(Number(reqLng))
      ? { lat: Number(reqLat), lng: Number(reqLng) }
      : coords ?? { lat: 30.9702876, lng: 76.8028933 }

  const gpsGateView = (
    <div className="card" style={{ marginTop: 24 }}>
      <h2 className="cardTitle">GPS required</h2>
      <div className="muted">
        This app requires a device that can provide <b>high-accuracy</b> location. Please allow location permission and
        enable “High accuracy”.
      </div>
      {gpsGate === 'no_geolocation' ? <div className="msgErr">Your browser does not support Geolocation.</div> : null}
      {gpsGate === 'permission_denied' ? (
        <div className="msgErr">Location permission denied. Enable it for this site, then retry.</div>
      ) : null}
      {gpsGate === 'low_accuracy' ? (
        <div className="msgErr">
          Accuracy is too low{gpsAccuracyM !== null ? ` (~${Math.round(gpsAccuracyM)}m)` : ''}. Turn on GPS/high
          accuracy mode and retry.
        </div>
      ) : null}
      {gpsGate === 'error' || gpsGate === 'checking' ? (
        <div className="muted" style={{ marginTop: 10 }}>
          {gpsGate === 'checking' ? 'Checking your location…' : 'Could not verify location.'}
        </div>
      ) : null}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="smallBtn" onClick={requestLocation} disabled={isLocating}>
          {isLocating ? 'Detecting…' : 'Retry'}
        </button>
      </div>
      <div className="muted" style={{ marginTop: 10 }}>
        Required accuracy threshold: {GPS_REQUIRED_MAX_ACCURACY_M}m or better.
      </div>
    </div>
  )

  if (gpsGate !== 'ok') return gpsGateView

  return (
    <motion.div
      className="grid"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <MapPickerModal
        open={mapModalOpen}
        initial={coords ?? { lat: 30.9702876, lng: 76.8028933 }}
        value={currentReqLatLng}
        onClose={() => setMapModalOpen(false)}
        onConfirm={(next) => {
          setReqLat(String(next.lat))
          setReqLng(String(next.lng))
          fillAddressFromLatLng(next.lat, next.lng)
        }}
      />

      <motion.div
        className="card forestCard"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
      >
        <h2 className="cardTitle">Nearest dustbin</h2>
        {roundedCoords && (
          <div className="kv">
            <div className="kvKey">Your location</div>
            <div className="kvVal">
              {roundedCoords.lat}, {roundedCoords.lng}
            </div>
          </div>
        )}

        <div className="row" style={{ marginTop: 10 }}>
          <button className="smallBtn ghostBtn" onClick={requestLocation} disabled={isLocating}>
            Re-detect location
          </button>
          <div className="muted">Best results on mobile with GPS/high accuracy.</div>
        </div>

        {nearestLoading ? (
          <div className="muted" style={{ marginTop: 10 }}>
            Finding nearest dustbin…
          </div>
        ) : nearestError ? (
          <div className="msgErr">{nearestError}</div>
        ) : nearest?.dustbin ? (
          <>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
              <div className="muted">Directions</div>
              <button className="smallBtn forestBtn" onClick={openNavigation}>
                Navigate
              </button>
            </div>
            <div className="kv">
              <div className="kvKey">Name</div>
              <div className="kvVal">{nearest.dustbin?.name ?? 'Dustbin'}</div>
              <div className="kvKey">Address</div>
              <div className="kvVal">{nearest.dustbin?.address ?? '—'}</div>
              <div className="kvKey">Distance</div>
              <div className="kvVal">
                {typeof nearest.distanceMeters === 'number' ? `${Math.round(nearest.distanceMeters)} meters` : '—'}
              </div>
            </div>
          </>
        ) : (
          <div className="msgErr">No dustbins found yet. Submit a request to add one.</div>
        )}
      </motion.div>

      <motion.div
        className="card forestCard"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.10 }}
      >
        <h2 className="cardTitle">Request a new dustbin</h2>
        <div className="muted">Pick a point on the map and send it to the admin for approval.</div>

        <form onSubmit={submitRequest}>
          <div className="field">
            <label className="muted">Your email (optional)</label>
            <input value={reqEmail} onChange={(e) => setReqEmail(e.target.value)} placeholder="name@example.com" />
          </div>

          <div className="field">
            <label className="muted">Address / location name (auto-filled)</label>
            <div className="row">
              <input
                style={{ flex: 1, minWidth: 200 }}
                value={reqAddress}
                onChange={(e) => setReqAddress(e.target.value)}
                placeholder="Near..."
              />
              <button
                type="button"
                className="smallBtn ghostBtn"
                onClick={() => {
                  const lat = Number(reqLat)
                  const lng = Number(reqLng)
                  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
                  fillAddressFromLatLng(lat, lng)
                }}
                disabled={reqAddrStatus === 'loading'}
              >
                {reqAddrStatus === 'loading' ? 'Looking…' : 'Refresh'}
              </button>
            </div>
            {reqAddrHint ? <div className="muted">{reqAddrHint}</div> : null}
          </div>

          <div className="field">
            <label className="muted">Note (optional)</label>
            <textarea value={reqNote} onChange={(e) => setReqNote(e.target.value)} placeholder="Landmark details…" />
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div className="field" style={{ marginTop: 0 }}>
                <label className="muted">Latitude</label>
                <input value={reqLat} onChange={(e) => setReqLat(e.target.value)} />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div className="field" style={{ marginTop: 0 }}>
                <label className="muted">Longitude</label>
                <input value={reqLng} onChange={(e) => setReqLng(e.target.value)} />
              </div>
            </div>
            <button
              type="button"
              className="smallBtn ghostBtn"
              onClick={() => {
                if (!coords) requestLocation()
                else {
                  setReqLat(String(coords.lat))
                  setReqLng(String(coords.lng))
                  fillAddressFromLatLng(coords.lat, coords.lng)
                }
              }}
            >
              Use my location
            </button>
          </div>

          <div className="field">
            <label className="muted">Pick location on map</label>
            <div className="row">
              <button type="button" className="smallBtn forestBtn" onClick={() => setMapModalOpen(true)}>
                Open full-screen map
              </button>
              <div className="muted">
                Current: {Number(reqLat).toFixed(6)}, {Number(reqLng).toFixed(6)}
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <MapPicker
                value={Number.isFinite(Number(reqLat)) && Number.isFinite(Number(reqLng)) ? currentReqLatLng : null}
                initialCenter={coords ?? { lat: 30.9702876, lng: 76.8028933 }}
                height={180}
                zoom={15}
                onChange={(next) => {
                  setReqLat(String(next.lat))
                  setReqLng(String(next.lng))
                  fillAddressFromLatLng(next.lat, next.lng)
                }}
              />
            </div>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <button type="submit" className="forestBtn">
              Send request
            </button>
          </div>
        </form>

        {reqMsg?.kind === 'ok' ? <div className="msgOk">{reqMsg.text}</div> : null}
        {reqMsg?.kind === 'err' ? <div className="msgErr">{reqMsg.text}</div> : null}
      </motion.div>
    </motion.div>
  )
}


