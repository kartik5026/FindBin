import '../App.css'
import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiRequest } from '../api'
import { motion } from 'framer-motion'

export function AdminPage() {
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminToken, setAdminToken] = useState<string>(() => {
    try {
      return localStorage.getItem('authToken') ?? ''
    } catch {
      return ''
    }
  })
  const [adminMsg, setAdminMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [adminPanel, setAdminPanel] = useState<'approvals' | 'dustbins' | 'users'>('approvals')

  // approvals
  const [requests, setRequests] = useState<any[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)

  // dustbins
  const [dustbins, setDustbins] = useState<any[]>([])
  const [dustbinsLoading, setDustbinsLoading] = useState(false)
  const [newDustbinName, setNewDustbinName] = useState('')
  const [newDustbinAddress, setNewDustbinAddress] = useState('')
  const [newDustbinLat, setNewDustbinLat] = useState('')
  const [newDustbinLng, setNewDustbinLng] = useState('')

  // users
  const [users, setUsers] = useState<any[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user')
  const [newUserPhone, setNewUserPhone] = useState('')

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
      try {
        localStorage.setItem('authToken', token)
      } catch {}
      setAdminToken(token)
      setAdminMsg({ kind: 'ok', text: 'Logged in.' })
    } catch (err: any) {
      setAdminMsg({ kind: 'err', text: err?.message ?? 'Login failed' })
    }
  }

  function adminLogout() {
    try {
      localStorage.removeItem('authToken')
    } catch {}
    setAdminToken('')
    setAdminEmail('')
    setAdminPassword('')
    setRequests([])
    setDustbins([])
    setUsers([])
    setAdminMsg({ kind: 'ok', text: 'Logged out.' })
  }

  async function loadRequests() {
    if (!adminToken) return
    setRequestsLoading(true)
    setAdminMsg(null)
    try {
      const data = await apiGet<any>('/api/admin/dustbin-requests?status=pending', { token: adminToken })
      setRequests(data?.requests ?? [])
    } catch (err: any) {
      setAdminMsg({ kind: 'err', text: err?.message ?? 'Failed to load requests' })
    } finally {
      setRequestsLoading(false)
    }
  }

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
      await apiRequest<any>(`/api/admin/dustbins/${id}`, { method: 'PUT', token: adminToken, body })
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
      await apiRequest<any>(`/api/admin/dustbins/${id}`, { method: 'DELETE', token: adminToken })
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
      await apiRequest<any>(`/api/users/admin/users/${id}`, { method: 'PUT', token: adminToken, body })
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
      await apiRequest<any>(`/api/users/admin/users/${id}`, { method: 'DELETE', token: adminToken })
      setAdminMsg({ kind: 'ok', text: 'User deleted.' })
      loadUsers()
    } catch (err: any) {
      setAdminMsg({ kind: 'err', text: err?.message ?? 'Failed to delete user' })
    }
  }

  useEffect(() => {
    if (!adminToken) return
    if (adminPanel === 'approvals') loadRequests()
    if (adminPanel === 'dustbins') loadDustbins()
    if (adminPanel === 'users') loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken, adminPanel])

  return (
    <motion.div
      className="grid"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="card forestCard">
        <h2 className="cardTitle">Admin panel</h2>
        <div className="muted">Manage requests, dustbins and users.</div>

        {!adminToken ? (
          <form onSubmit={adminLogin}>
            <div className="field">
              <label className="muted">Email</label>
              <input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
            </div>
            <div className="field">
              <label className="muted">Password</label>
              <input value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} type="password" />
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button type="submit" className="forestBtn">
                Login
              </button>
            </div>
          </form>
        ) : (
          <div className="row" style={{ marginTop: 12 }}>
            <button className={`smallBtn ${adminPanel === 'approvals' ? 'forestBtn' : 'ghostBtn'}`} onClick={() => setAdminPanel('approvals')}>
              Approvals
            </button>
            <button className={`smallBtn ${adminPanel === 'dustbins' ? 'forestBtn' : 'ghostBtn'}`} onClick={() => setAdminPanel('dustbins')}>
              Dustbins
            </button>
            <button className={`smallBtn ${adminPanel === 'users' ? 'forestBtn' : 'ghostBtn'}`} onClick={() => setAdminPanel('users')}>
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
                        <button className="smallBtn forestBtn" onClick={() => approve(r._id)}>
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
              <div className="muted">Manage dustbins</div>
              <button className="smallBtn ghostBtn" onClick={loadDustbins} disabled={dustbinsLoading}>
                Refresh
              </button>
            </div>

            <div className="card" style={{ marginTop: 12, boxShadow: 'none' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Add dustbin</div>
              <div className="row">
                <input style={{ flex: 1, minWidth: 180 }} placeholder="Name" value={newDustbinName} onChange={(e) => setNewDustbinName(e.target.value)} />
                <input style={{ flex: 1, minWidth: 180 }} placeholder="Address" value={newDustbinAddress} onChange={(e) => setNewDustbinAddress(e.target.value)} />
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <input style={{ width: 180 }} placeholder="Latitude" value={newDustbinLat} onChange={(e) => setNewDustbinLat(e.target.value)} />
                <input style={{ width: 180 }} placeholder="Longitude" value={newDustbinLng} onChange={(e) => setNewDustbinLng(e.target.value)} />
                <button className="smallBtn forestBtn" onClick={createDustbin}>
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
              <div className="row" style={{ gap: 12, flexDirection: 'column', alignItems: 'stretch', marginTop: 12 }}>
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
                          onBlur={(e) => saveDustbin(d._id, { name: e.target.value, address: d.address ?? '', lat: String(lat ?? ''), lng: String(lng ?? '') })}
                        />
                        <input
                          style={{ flex: 1, minWidth: 180 }}
                          defaultValue={d.address ?? ''}
                          onBlur={(e) => saveDustbin(d._id, { name: d.name, address: e.target.value, lat: String(lat ?? ''), lng: String(lng ?? '') })}
                        />
                      </div>
                      <div className="row" style={{ marginTop: 8 }}>
                        <input
                          style={{ width: 180 }}
                          defaultValue={lat ?? ''}
                          onBlur={(e) => saveDustbin(d._id, { name: d.name, address: d.address ?? '', lat: e.target.value, lng: String(lng ?? '') })}
                        />
                        <input
                          style={{ width: 180 }}
                          defaultValue={lng ?? ''}
                          onBlur={(e) => saveDustbin(d._id, { name: d.name, address: d.address ?? '', lat: String(lat ?? ''), lng: e.target.value })}
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
              <div className="muted">Manage users</div>
              <button className="smallBtn ghostBtn" onClick={loadUsers} disabled={usersLoading}>
                Refresh
              </button>
            </div>

            <div className="card" style={{ marginTop: 12, boxShadow: 'none' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Add user</div>
              <div className="row">
                <input style={{ flex: 1, minWidth: 160 }} placeholder="Name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                <input style={{ flex: 1, minWidth: 180 }} placeholder="Email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <input style={{ flex: 1, minWidth: 160 }} placeholder="Password" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
                <input style={{ width: 140 }} placeholder="Role (admin/user)" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value === 'admin' ? 'admin' : 'user')} />
                <input style={{ width: 160 }} placeholder="Phone" value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} />
                <button className="smallBtn forestBtn" onClick={createUser}>
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
              <div className="row" style={{ gap: 12, flexDirection: 'column', alignItems: 'stretch', marginTop: 12 }}>
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
                      <input style={{ width: 160 }} defaultValue={u.role ?? 'user'} onBlur={(e) => updateUser(u._id, { role: e.target.value })} />
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

      <div className="card forestCard">
        <h2 className="cardTitle">Notes</h2>
        <div className="muted">
          Admin endpoints require <code>Authorization: Bearer &lt;token&gt;</code>.
        </div>
      </div>
    </motion.div>
  )
}


