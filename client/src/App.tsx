import './App.css'
import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from './api'
import { MapPicker } from './components/MapPicker'
import { reverseGeocode } from './geocode'
import { MapPickerModal } from './components/MapPickerModal'

function App() {
  const [view, setView] = useState<'user' | 'admin'>('user')

  // user location + nearest dustbin
  const [geoStatus, setGeoStatus] = useState<
    'idle' | 'requesting' | 'ready' | 'denied' | 'error'
  >('idle')
  const [isLocating, setIsLocating] = useState(false)
  const GPS_REQUIRED_MAX_ACCURACY_M = 80
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

  // admin
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminToken, setAdminToken] = useState<string>(() => localStorage.getItem('authToken') ?? '')
  const [adminMsg, setAdminMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [adminPanel, setAdminPanel] = useState<'approvals' | 'dustbins' | 'users'>('approvals')

  // admin dustbins CRUD
  const [dustbins, setDustbins] = useState<any[]>([])
  const [dustbinsLoading, setDustbinsLoading] = useState(false)
  const [newDustbinName, setNewDustbinName] = useState('')
  const [newDustbinAddress, setNewDustbinAddress] = useState('')
  const [newDustbinLat, setNewDustbinLat] = useState('')
  const [newDustbinLng, setNewDustbinLng] = useState('')

  // admin users CRUD
  const [users, setUsers] = useState<any[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user')
  const [newUserPhone, setNewUserPhone] = useState('')

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
        // Don't overwrite form coords if user already picked something
        setReqLat((prev) => (prev.trim() ? prev : String(next.lat)))
        setReqLng((prev) => (prev.trim() ? prev : String(next.lng)))
        setGeoStatus('ready')
        setIsLocating(false)

        // Gate: require high-accuracy location (typically GPS on phones).
        if (accuracy !== null && accuracy > GPS_REQUIRED_MAX_ACCURACY_M) {
          setGpsGate('low_accuracy')
        } else {
          setGpsGate('ok')
        }
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
    // On app open, request user location immediately (so we can show nearest dustbin)
    if (!hasGeo) return
    if (geoStatus !== 'idle') return
    requestLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Hard gate: only allow the app if we have high-accuracy location.
  if (gpsGate !== 'ok') {
    return (
      <div className="app">
        <div className="card" style={{ marginTop: 24 }}>
          <h2 className="cardTitle">GPS required</h2>
          <div className="muted">
            This app requires a device that can provide <b>high-accuracy</b> location (GPS). If you are on a desktop
            without GPS, please use a phone.
          </div>

          {gpsGate === 'no_geolocation' ? (
            <div className="msgErr">Your browser does not support Geolocation.</div>
          ) : null}
          {gpsGate === 'permission_denied' ? (
            <div className="msgErr">
              Location permission denied. Enable location permission for this site, then retry.
            </div>
          ) : null}
          {gpsGate === 'low_accuracy' ? (
            <div className="msgErr">
              Your location accuracy is too low
              {gpsAccuracyM !== null ? ` (~${Math.round(gpsAccuracyM)}m)` : ''}. Turn on GPS / high accuracy mode and
              retry.
            </div>
          ) : null}
          {gpsGate === 'error' || gpsGate === 'checking' ? (
            <div className="muted" style={{ marginTop: 10 }}>
              {gpsGate === 'checking' ? 'Checking your GPS…' : 'Could not verify GPS.'}
            </div>
          ) : null}

          <div className="row" style={{ marginTop: 12 }}>
            <button className="smallBtn" onClick={requestLocation} disabled={geoStatus === 'requesting'}>
              {geoStatus === 'requesting' ? 'Detecting…' : 'Retry GPS check'}
            </button>
          </div>

          <div className="muted" style={{ marginTop: 10 }}>
            Required accuracy threshold: {GPS_REQUIRED_MAX_ACCURACY_M}m or better.
          </div>
        </div>
      </div>
    )
  }

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

    // Google Maps directions (works great on mobile too)
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

  async function adminLogin(e: React.FormEvent) {
    e.preventDefault()
    setAdminMsg(null)
    try {
      const data = await apiPost<any>('/api/users/login-user', {
        email: adminEmail,
        password: adminPassword,
      })
      const token = data?.token
      if (!token) throw new Error('No token returned from server')
      localStorage.setItem('authToken', token)
      setAdminToken(token)
      setAdminMsg({ kind: 'ok', text: 'Logged in.' })
    } catch (err: any) {
      setAdminMsg({ kind: 'err', text: err?.message ?? 'Login failed' })
    }
  }

  async function loadRequests() {
    if (!adminToken) return
    setRequestsLoading(true)
    setAdminMsg(null)
    try {
      const data = await apiGet<any>('/api/admin/dustbin-requests?status=pending', {
        token: adminToken,
      })
      setRequests(data?.requests ?? [])
    } catch (err: any) {
      setAdminMsg({ kind: 'err', text: err?.message ?? 'Failed to load requests' })
    } finally {
      setRequestsLoading(false)
    }
  }

  async function loadDustbins() {
    if (!adminToken) return
    setDustbinsLoading(true)
    setAdminMsg(null)
    try {
      const data = await apiGet<any>('/api/admin/dustbins', { token: adminToken })
      setDustbins(data?.dustbins ?? [])
    } catch (err: any) {
      setAdminMsg({ kind: 'err', text: err?.message ?? 'Failed to load dustbins' })
    } finally {
      setDustbinsLoading(false)
    }
  }

  async function createDustbin() {
    if (!adminToken) return
    setAdminMsg(null)
    const lat = Number(newDustbinLat)
    const lng = Number(newDustbinLng)
    if (!newDustbinName.trim()) {
      setAdminMsg({ kind: 'err', text: 'Dustbin name is required' })
      return
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setAdminMsg({ kind: 'err', text: 'Valid lat/lng is required' })
      return
    }
    try {
      await apiPost<any>(
        '/api/admin/dustbins',
        { name: newDustbinName, address: newDustbinAddress, lat, lng },
        { token: adminToken }
      )
      setAdminMsg({ kind: 'ok', text: 'Dustbin created.' })
      setNewDustbinName('')
      setNewDustbinAddress('')
      setNewDustbinLat('')
      setNewDustbinLng('')
      loadDustbins()
    } catch (err: any) {
      setAdminMsg({ kind: 'err', text: err?.message ?? 'Failed to create dustbin' })
    }
  }

  async function saveDustbin(id: string, draft: { name: string; address: string; lat: string; lng: string }) {
    if (!adminToken) return
    setAdminMsg(null)
    const body: any = { name: draft.name, address: draft.address }
    const lat = Number(draft.lat)
    const lng = Number(draft.lng)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      body.lat = lat
      body.lng = lng
    }
    try {
      const res = await fetch(`/api/admin/dustbins/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw data
      setAdminMsg({ kind: 'ok', text: 'Dustbin updated.' })
      loadDustbins()
    } catch (err: any) {
      setAdminMsg({ kind: 'err', text: err?.message ?? 'Failed to update dustbin' })
    }
  }

  async function deleteDustbin(id: string) {
    if (!adminToken) return
    setAdminMsg(null)
    try {
      const res = await fetch(`/api/admin/dustbins/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw data
      setAdminMsg({ kind: 'ok', text: 'Dustbin deleted.' })
      loadDustbins()
    } catch (err: any) {
      setAdminMsg({ kind: 'err', text: err?.message ?? 'Failed to delete dustbin' })
    }
  }

  async function loadUsers() {
    if (!adminToken) return
    setUsersLoading(true)
    setAdminMsg(null)
    try {
      const data = await apiGet<any>('/api/users/admin/users', { token: adminToken })
      setUsers(data?.users ?? [])
    } catch (err: any) {
      setAdminMsg({ kind: 'err', text: err?.message ?? 'Failed to load users' })
    } finally {
      setUsersLoading(false)
    }
  }

  async function createUser() {
    if (!adminToken) return
    setAdminMsg(null)
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      setAdminMsg({ kind: 'err', text: 'Email and password are required' })
      return
    }
    try {
      const phone = newUserPhone.trim() === '' ? undefined : Number(newUserPhone)
      await apiPost<any>(
        '/api/users/admin/users',
        {
          userName: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          phone: Number.isFinite(phone) ? phone : undefined,
        },
        { token: adminToken }
      )
      setAdminMsg({ kind: 'ok', text: 'User created.' })
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPassword('')
      setNewUserRole('user')
      setNewUserPhone('')
      loadUsers()
    } catch (err: any) {
      setAdminMsg({ kind: 'err', text: err?.message ?? 'Failed to create user' })
    }
  }

  async function updateUser(id: string, body: any) {
    if (!adminToken) return
    setAdminMsg(null)
    try {
      const res = await fetch(`/api/users/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw data
      setAdminMsg({ kind: 'ok', text: 'User updated.' })
      loadUsers()
    } catch (err: any) {
      setAdminMsg({ kind: 'err', text: err?.message ?? 'Failed to update user' })
    }
  }

  async function deleteUser(id: string) {
    if (!adminToken) return
    setAdminMsg(null)
    try {
      const res = await fetch(`/api/users/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw data
      setAdminMsg({ kind: 'ok', text: 'User deleted.' })
      loadUsers()
    } catch (err: any) {
      setAdminMsg({ kind: 'err', text: err?.message ?? 'Failed to delete user' })
    }
  }

  useEffect(() => {
    if (view !== 'admin') return
    if (!adminToken) return
    if (adminPanel === 'approvals') loadRequests()
    if (adminPanel === 'dustbins') loadDustbins()
    if (adminPanel === 'users') loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, adminToken, adminPanel])

  async function approve(id: string) {
    if (!adminToken) return
    setAdminMsg(null)
    try {
      await apiPost<any>(`/api/admin/dustbin-requests/${id}/approve`, {}, { token: adminToken })
      setAdminMsg({ kind: 'ok', text: 'Approved and added as dustbin.' })
      loadRequests()
    } catch (err: any) {
      setAdminMsg({ kind: 'err', text: err?.message ?? 'Approve failed' })
    }
  }

  async function reject(id: string) {
    if (!adminToken) return
    setAdminMsg(null)
    try {
      await apiPost<any>(`/api/admin/dustbin-requests/${id}/reject`, {}, { token: adminToken })
      setAdminMsg({ kind: 'ok', text: 'Rejected.' })
      loadRequests()
    } catch (err: any) {
      setAdminMsg({ kind: 'err', text: err?.message ?? 'Reject failed' })
    }
  }

  function adminLogout() {
    localStorage.removeItem('authToken')
    setAdminToken('')
    setAdminEmail('')
    setAdminPassword('')
    setRequests([])
    setDustbins([])
    setUsers([])
    setAdminMsg({ kind: 'ok', text: 'Logged out.' })
  }

  return (
    <div className="app">
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
      <div className="topbar">
        <div className="brand">
          <div className="brandTitle">FindBin</div>
          <div className="brandSub">Nearest dustbin + request approvals</div>
        </div>
        <div className="tabs">
          <button
            className={`tabBtn smallBtn ${view === 'user' ? 'tabBtnActive' : ''}`}
            onClick={() => setView('user')}
          >
            User
          </button>
          <button
            className={`tabBtn smallBtn ${view === 'admin' ? 'tabBtnActive' : ''}`}
            onClick={() => setView('admin')}
          >
            Admin
          </button>
        </div>
      </div>

      {view === 'user' ? (
        <div className="grid">
      <div className="card">
            <h2 className="cardTitle">Nearest dustbin</h2>
            {!hasGeo ? (
              <div className="msgErr">Your browser does not support geolocation.</div>
            ) : geoStatus === 'requesting' ? (
              <div className="muted">Getting your location…</div>
            ) : geoStatus === 'denied' ? (
              <div className="msgErr">
                Location permission denied. Enable it in your browser settings, then click “Re-detect location”.
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="smallBtn" onClick={requestLocation}>
                    Re-detect location
                  </button>
                </div>
              </div>
            ) : geoStatus === 'error' ? (
              <div className="msgErr">
                Could not get your location (this can happen on desktops without GPS). Turn on device location
                services / use a phone, then click “Re-detect location”.
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="smallBtn" onClick={requestLocation}>
                    Re-detect location
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                  <div className="muted">If this looks wrong, refresh it before navigating.</div>
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
                      <button className="smallBtn" onClick={openNavigation}>
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
                        {typeof nearest.distanceMeters === 'number'
                          ? `${Math.round(nearest.distanceMeters)} meters`
                          : '—'}
                      </div>
                      <div className="kvKey">Coordinates</div>
                      <div className="kvVal">
                        {nearest.dustbin?.location?.coordinates?.[1]},{' '}
                        {nearest.dustbin?.location?.coordinates?.[0]}
                      </div>
      </div>
                  </>
                ) : (
                  <div className="msgErr">No dustbins found yet. Submit a request to add one.</div>
                )}
              </>
            )}
          </div>

          <div className="card">
            <h2 className="cardTitle">Request a new dustbin</h2>
            <div className="muted">
              This will send a request to the admin (global admin for now). When approved, it becomes a
              real dustbin.
            </div>

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
                <textarea value={reqNote} onChange={(e) => setReqNote(e.target.value)} placeholder="Why this spot needs a bin..." />
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
                    if (!coords) {
                      requestLocation()
                      return
                    }
                    setReqLat(String(coords.lat))
                    setReqLng(String(coords.lng))
                    fillAddressFromLatLng(coords.lat, coords.lng)
                  }}
                >
                  Use my location
                </button>
              </div>

              <div className="field">
                <label className="muted">Pick location on map</label>

                <div className="row">
                  <button type="button" className="smallBtn" onClick={() => setMapModalOpen(true)}>
                    Open full-screen map
                  </button>
                  <div className="muted">
                    Current: {Number(reqLat).toFixed(6)}, {Number(reqLng).toFixed(6)}
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <MapPicker
                    value={
                      Number.isFinite(Number(reqLat)) && Number.isFinite(Number(reqLng))
                        ? { lat: Number(reqLat), lng: Number(reqLng) }
                        : null
                    }
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
                <button type="submit">Send request</button>
              </div>
            </form>

            {reqMsg?.kind === 'ok' ? <div className="msgOk">{reqMsg.text}</div> : null}
            {reqMsg?.kind === 'err' ? <div className="msgErr">{reqMsg.text}</div> : null}
          </div>
        </div>
      ) : (
        <div className="grid">
          <div className="card">
            <h2 className="cardTitle">Admin approvals</h2>
            <div className="muted">
              Login with an <b>admin</b> user. Then you can approve/reject pending dustbin requests.
            </div>

            {!adminToken ? (
              <form onSubmit={adminLogin}>
                <div className="field">
                  <label className="muted">Email</label>
                  <input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                </div>
                <div className="field">
                  <label className="muted">Password</label>
                  <input
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    type="password"
                  />
                </div>
                <div className="row" style={{ marginTop: 12 }}>
                  <button type="submit">Login</button>
                </div>
              </form>
            ) : (
              <div className="row" style={{ marginTop: 12 }}>
                <button
                  className={`smallBtn ${adminPanel === 'approvals' ? '' : 'ghostBtn'}`}
                  onClick={() => setAdminPanel('approvals')}
                >
                  Approvals
                </button>
                <button
                  className={`smallBtn ${adminPanel === 'dustbins' ? '' : 'ghostBtn'}`}
                  onClick={() => setAdminPanel('dustbins')}
                >
                  Dustbins
                </button>
                <button
                  className={`smallBtn ${adminPanel === 'users' ? '' : 'ghostBtn'}`}
                  onClick={() => setAdminPanel('users')}
                >
                  Users
                </button>
                <button className="smallBtn ghostBtn" onClick={adminLogout}>
                  Logout
                </button>
              </div>
            )}

            {adminMsg?.kind === 'ok' ? <div className="msgOk">{adminMsg.text}</div> : null}
            {adminMsg?.kind === 'err' ? <div className="msgErr">{adminMsg.text}</div> : null}

            {adminToken && adminPanel === 'approvals' ? (
              <div style={{ marginTop: 14 }}>
                {requestsLoading ? (
                  <div className="muted">Loading requests…</div>
                ) : requests.length === 0 ? (
                  <div className="muted">No pending requests.</div>
                ) : (
                  <div className="row" style={{ gap: 12, flexDirection: 'column', alignItems: 'stretch' }}>
                    {requests.map((r) => (
                      <div key={r._id} className="card" style={{ boxShadow: 'none' }}>
                        <div className="row" style={{ justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontWeight: 700 }}>Request</div>
                            <div className="muted">{new Date(r.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="row">
                            <button className="smallBtn" onClick={() => approve(r._id)}>
                              Approve
                            </button>
                            <button className="smallBtn ghostBtn" onClick={() => reject(r._id)}>
                              Reject
                            </button>
                          </div>
                        </div>

                        <div className="kv" style={{ marginTop: 10 }}>
                          <div className="kvKey">Email</div>
                          <div className="kvVal">{r.createdByEmail ?? '—'}</div>
                          <div className="kvKey">Address</div>
                          <div className="kvVal">{r.address ?? '—'}</div>
                          <div className="kvKey">Note</div>
                          <div className="kvVal">{r.note ?? '—'}</div>
                          <div className="kvKey">Coordinates</div>
                          <div className="kvVal">
                            {r.location?.coordinates?.[1]}, {r.location?.coordinates?.[0]}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {adminToken && adminPanel === 'dustbins' ? (
              <div style={{ marginTop: 14 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className="muted">Manage dustbins (add / edit / delete)</div>
                  <button className="smallBtn" onClick={loadDustbins} disabled={dustbinsLoading}>
                    Refresh
                  </button>
                </div>

                <div className="card" style={{ marginTop: 12, boxShadow: 'none' }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Add dustbin</div>
                  <div className="row">
                    <input
                      style={{ flex: 1, minWidth: 180 }}
                      placeholder="Name"
                      value={newDustbinName}
                      onChange={(e) => setNewDustbinName(e.target.value)}
                    />
                    <input
                      style={{ flex: 1, minWidth: 180 }}
                      placeholder="Address"
                      value={newDustbinAddress}
                      onChange={(e) => setNewDustbinAddress(e.target.value)}
                    />
                  </div>
                  <div className="row" style={{ marginTop: 8 }}>
                    <input
                      style={{ width: 180 }}
                      placeholder="Latitude"
                      value={newDustbinLat}
                      onChange={(e) => setNewDustbinLat(e.target.value)}
                    />
                    <input
                      style={{ width: 180 }}
                      placeholder="Longitude"
                      value={newDustbinLng}
                      onChange={(e) => setNewDustbinLng(e.target.value)}
                    />
                    <button className="smallBtn" onClick={createDustbin}>
                      Add
                    </button>
                  </div>
                </div>

                {dustbinsLoading ? (
                  <div className="muted" style={{ marginTop: 10 }}>
                    Loading dustbins…
                  </div>
                ) : dustbins.length === 0 ? (
                  <div className="muted" style={{ marginTop: 10 }}>
                    No dustbins.
                  </div>
                ) : (
                  <div
                    className="row"
                    style={{ gap: 12, flexDirection: 'column', alignItems: 'stretch', marginTop: 12 }}
                  >
                    {dustbins.map((d) => {
                      const lat = d?.location?.coordinates?.[1]
                      const lng = d?.location?.coordinates?.[0]
                      return (
                        <div key={d._id} className="card" style={{ boxShadow: 'none' }}>
                          <div className="row" style={{ justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: 700 }}>{d.name}</div>
                            <button className="smallBtn ghostBtn" onClick={() => deleteDustbin(d._id)}>
                              Delete
                            </button>
                          </div>
                          <div className="row" style={{ marginTop: 8 }}>
                            <input
                              style={{ flex: 1, minWidth: 180 }}
                              defaultValue={d.name}
                              onBlur={(e) =>
                                saveDustbin(d._id, {
                                  name: e.target.value,
                                  address: d.address ?? '',
                                  lat: String(lat ?? ''),
                                  lng: String(lng ?? ''),
                                })
                              }
                            />
                            <input
                              style={{ flex: 1, minWidth: 180 }}
                              defaultValue={d.address ?? ''}
                              onBlur={(e) =>
                                saveDustbin(d._id, {
                                  name: d.name,
                                  address: e.target.value,
                                  lat: String(lat ?? ''),
                                  lng: String(lng ?? ''),
                                })
                              }
                            />
                          </div>
                          <div className="row" style={{ marginTop: 8 }}>
                            <input
                              style={{ width: 180 }}
                              defaultValue={lat ?? ''}
                              onBlur={(e) =>
                                saveDustbin(d._id, {
                                  name: d.name,
                                  address: d.address ?? '',
                                  lat: e.target.value,
                                  lng: String(lng ?? ''),
                                })
                              }
                            />
                            <input
                              style={{ width: 180 }}
                              defaultValue={lng ?? ''}
                              onBlur={(e) =>
                                saveDustbin(d._id, {
                                  name: d.name,
                                  address: d.address ?? '',
                                  lat: String(lat ?? ''),
                                  lng: e.target.value,
                                })
                              }
                            />
                            <div className="muted">Edit fields then click outside to save</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {adminToken && adminPanel === 'users' ? (
              <div style={{ marginTop: 14 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className="muted">Manage users (add / role / delete)</div>
                  <button className="smallBtn" onClick={loadUsers} disabled={usersLoading}>
                    Refresh
                  </button>
                </div>

                <div className="card" style={{ marginTop: 12, boxShadow: 'none' }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Add user</div>
                  <div className="row">
                    <input
                      style={{ flex: 1, minWidth: 160 }}
                      placeholder="Name"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                    />
                    <input
                      style={{ flex: 1, minWidth: 180 }}
                      placeholder="Email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                    />
                  </div>
                  <div className="row" style={{ marginTop: 8 }}>
                    <input
                      style={{ flex: 1, minWidth: 160 }}
                      placeholder="Password"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                    />
                    <input
                      style={{ width: 140 }}
                      placeholder="Role (admin/user)"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value === 'admin' ? 'admin' : 'user')}
                    />
                    <input
                      style={{ width: 160 }}
                      placeholder="Phone"
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                    />
                    <button className="smallBtn" onClick={createUser}>
                      Add
                    </button>
                  </div>
                </div>

                {usersLoading ? (
                  <div className="muted" style={{ marginTop: 10 }}>
                    Loading users…
                  </div>
                ) : users.length === 0 ? (
                  <div className="muted" style={{ marginTop: 10 }}>
                    No users.
                  </div>
                ) : (
                  <div
                    className="row"
                    style={{ gap: 12, flexDirection: 'column', alignItems: 'stretch', marginTop: 12 }}
                  >
                    {users.map((u) => (
                      <div key={u._id} className="card" style={{ boxShadow: 'none' }}>
                        <div className="row" style={{ justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontWeight: 700 }}>{u.userName ?? '—'}</div>
                            <div className="muted">{u.email}</div>
                          </div>
                          <button className="smallBtn ghostBtn" onClick={() => deleteUser(u._id)}>
                            Delete
                          </button>
                        </div>

                        <div className="row" style={{ marginTop: 8 }}>
                          <input
                            style={{ width: 160 }}
                            defaultValue={u.role ?? 'user'}
                            onBlur={(e) => updateUser(u._id, { role: e.target.value })}
                          />
                          <input
                            style={{ flex: 1, minWidth: 180 }}
                            placeholder="Set new password (optional)"
                            type="password"
                            onBlur={(e) => {
                              if (!e.target.value.trim()) return
                              updateUser(u._id, { password: e.target.value })
                              e.target.value = ''
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="card">
            <h2 className="cardTitle">Setup note</h2>
            <div className="muted">
              To create an admin user, call <code>/api/users/create-user</code> with <code>{"{ role: 'admin' }"}</code>.
            </div>
            <div className="muted" style={{ marginTop: 10 }}>
              The admin endpoints require an <code>Authorization: Bearer &lt;token&gt;</code> header (the UI stores
              it in localStorage after login).
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
