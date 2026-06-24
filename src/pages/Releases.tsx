import { useState, useEffect, useCallback } from 'react'
import '../css/Releases.css'

interface ReleaseFix {
  id: number | null
  jiraId: string
  description: string
}

interface ReleaseDeployment {
  id: number | null
  serviceName: string
  env: string
  interfaceCurrent: string
  interfaceSpeed: string
  serviceCurrent: string
  serviceSpeed: string
  wilfyConfig: string
  deploymentCurrent: string
  deploymentSpeed: string
  fixes: ReleaseFix[]
}

interface ReleaseRecord {
  id: number | null
  releaseDate: string
  name: string
  description: string
  filename: string
  deployments: ReleaseDeployment[]
}

const API_BASE = '/api/releases'
const PAGE_SIZE = 10

const SERVICE_OPTIONS = ['gtsales', 'vt2',"vt2-credit","gtsuic-messagedriven", 'timetable', 'storage', 'retrival','orderdistribution', 'payment', 'customer',"additionalproducts","edhDistibution"]
const ENV_OPTIONS = ['Q', 'R', 'A', 'O', 'A and O']

function getEmptyFix(): ReleaseFix {
  return { id: null, jiraId: '', description: '' }
}

function getEmptyDeployment(): ReleaseDeployment {
  return {
    id: null,
    serviceName: '',
    env: '',
    interfaceCurrent: '',
    interfaceSpeed: '',
    serviceCurrent: '',
    serviceSpeed: '',
    wilfyConfig: '',
    deploymentCurrent: '',
    deploymentSpeed: '',
    fixes: [],
  }
}

function getEmptyRelease(): ReleaseRecord {
  return {
    id: null,
    releaseDate: '',
    name: '',
    description: '',
    filename: '',
    deployments: [],
  }
}

function Releases() {
  const [releases, setReleases] = useState<ReleaseRecord[]>([])
  const [formRelease, setFormRelease] = useState<ReleaseRecord>(getEmptyRelease())
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [viewRelease, setViewRelease] = useState<ReleaseRecord | null>(null)

  // Fix detail popup
  const [viewFix, setViewFix] = useState<ReleaseFix | null>(null)

  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const clearMessages = () => { setSuccessMessage(''); setErrorMessage('') }
  const showSuccess = (msg: string) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(''), 3000) }
  const showError = (msg: string) => { setErrorMessage(msg); setTimeout(() => setErrorMessage(''), 4000) }

  const loadReleases = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/list`)
      if (!response.ok) throw new Error('API error')
      const data = await response.json()
      setReleases(data.data || data || [])
    } catch {
      setReleases([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadReleases() }, [loadReleases])

  const openAddForm = () => {
    setFormRelease(getEmptyRelease())
    setIsEditing(false)
    setShowForm(true)
    clearMessages()
  }

  const openEditForm = (release: ReleaseRecord) => {
    setFormRelease({ ...release, deployments: release.deployments?.map(d => ({ ...d, fixes: d.fixes?.map(f => ({ ...f })) || [] })) || [] })
    setIsEditing(true)
    setShowForm(true)
    clearMessages()
  }

  const closeForm = () => { setShowForm(false); setFormRelease(getEmptyRelease()) }

  const saveRelease = async () => {
    clearMessages()
    if (!formRelease.releaseDate.trim()) { showError('Release date is required'); return }
    if (!formRelease.name.trim()) { showError('Release name is required'); return }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formRelease),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Save failed')
      showSuccess(isEditing ? 'Release updated' : 'Release saved')
      setShowForm(false)
      setFormRelease(getEmptyRelease())
      loadReleases()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteRelease = async (release: ReleaseRecord) => {
    if (!release.id) return
    if (!confirm(`Delete release "${release.name}"?`)) return
    try {
      const response = await fetch(`${API_BASE}/delete/${release.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
      showSuccess('Release deleted')
      loadReleases()
    } catch {
      showError('Failed to delete')
    }
  }

  // Deployment management
  const addDeployment = () => {
    setFormRelease(prev => ({ ...prev, deployments: [...prev.deployments, getEmptyDeployment()] }))
  }

  const removeDeployment = (index: number) => {
    setFormRelease(prev => ({ ...prev, deployments: prev.deployments.filter((_, i) => i !== index) }))
  }

  const updateDeployment = (index: number, field: keyof ReleaseDeployment, value: string) => {
    setFormRelease(prev => ({
      ...prev,
      deployments: prev.deployments.map((d, i) => i === index ? { ...d, [field]: value } : d)
    }))
  }

  // Fix management
  const addFix = (depIndex: number) => {
    setFormRelease(prev => ({
      ...prev,
      deployments: prev.deployments.map((d, i) =>
        i === depIndex ? { ...d, fixes: [...d.fixes, getEmptyFix()] } : d
      )
    }))
  }

  const removeFix = (depIndex: number, fixIndex: number) => {
    setFormRelease(prev => ({
      ...prev,
      deployments: prev.deployments.map((d, i) =>
        i === depIndex ? { ...d, fixes: d.fixes.filter((_, fi) => fi !== fixIndex) } : d
      )
    }))
  }

  const updateFix = (depIndex: number, fixIndex: number, field: keyof ReleaseFix, value: string) => {
    setFormRelease(prev => ({
      ...prev,
      deployments: prev.deployments.map((d, i) =>
        i === depIndex ? { ...d, fixes: d.fixes.map((f, fi) => fi === fixIndex ? { ...f, [field]: value } : f) } : d
      )
    }))
  }

  // Filter
  const filteredReleases = releases.filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return r.name.toLowerCase().includes(s) ||
      r.releaseDate.includes(s) ||
      r.description.toLowerCase().includes(s)
  })

  const totalPages = Math.ceil(filteredReleases.length / PAGE_SIZE) || 1
  const pagedReleases = filteredReleases.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  useEffect(() => { setCurrentPage(1) }, [search])

  return (
    <div className="releases-container">
      {/* TOAST */}
      {(errorMessage || successMessage) && (
        <div className="rel-toast-overlay">
          <div className={`rel-toast ${errorMessage ? 'rel-toast-error' : 'rel-toast-success'}`}>
            <span>{errorMessage || successMessage}</span>
            <button className="rel-toast-close" onClick={clearMessages}>×</button>
          </div>
        </div>
      )}

      {/* FIX DETAIL POPUP */}
      {viewFix && (
        <div className="rel-modal-overlay rel-fix-overlay" onClick={() => setViewFix(null)}>
          <div className="rel-fix-popup" onClick={e => e.stopPropagation()}>
            <div className="rel-fix-popup-header">
              <h3>🔧 Fix Details</h3>
              <button className="rel-modal-close" onClick={() => setViewFix(null)}>×</button>
            </div>
            <div className="rel-fix-popup-body">
              <div className="rel-fix-popup-jira">
                <span className="rel-detail-label">JIRA ID</span>
                <span className="rel-jira-tag-large">{viewFix.jiraId}</span>
              </div>
              <div className="rel-fix-popup-desc">
                <span className="rel-detail-label">Description</span>
                <p className="rel-detail-text">{viewFix.description || '—'}</p>
              </div>
            </div>
            <div className="rel-fix-popup-footer">
              <button className="btn btn-secondary" onClick={() => setViewFix(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewRelease && (
        <div className="rel-modal-overlay" onClick={() => setViewRelease(null)}>
          <div className="rel-modal" onClick={e => e.stopPropagation()}>
            <div className="rel-modal-header">
              <h3>{viewRelease.name}</h3>
              <button className="rel-modal-close" onClick={() => setViewRelease(null)}>×</button>
            </div>

            <div className="rel-detail-grid">
              <div className="rel-detail-row"><span className="rel-detail-label">Date</span><span>{viewRelease.releaseDate}</span></div>
              <div className="rel-detail-row"><span className="rel-detail-label">Filename</span><span>{viewRelease.filename}</span></div>
            </div>
            <div className="rel-detail-section">
              <span className="rel-detail-label">Description</span>
              <p className="rel-detail-text">{viewRelease.description || '—'}</p>
            </div>

            {viewRelease.deployments?.map((dep, di) => (
              <div key={di} className="rel-deployment-view">
                <h4>{dep.serviceName} <span className="rel-env-badge">{dep.env}</span></h4>
                <div className="rel-dep-info">
                  <div><small>Interface:</small> {dep.interfaceCurrent} → {dep.interfaceSpeed}</div>
                  <div><small>Service:</small> {dep.serviceCurrent} → {dep.serviceSpeed}</div>
                  <div><small>Deployment:</small> {dep.deploymentCurrent} → {dep.deploymentSpeed}</div>
                  {dep.wilfyConfig && <div><small>Wilfy:</small> {dep.wilfyConfig}</div>}
                </div>
                {dep.fixes?.length > 0 && (
                  <div className="rel-fixes-list">
                    <strong>Fixes:</strong>
                    {dep.fixes.map((fix, fi) => (
                      <div key={fi} className="rel-fix-item">
                        <span className="rel-jira-tag rel-jira-clickable" onClick={() => setViewFix(fix)}>{fix.jiraId}</span> {fix.description}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="rel-modal-footer">
              <button className="btn btn-warning" onClick={() => { openEditForm(viewRelease); setViewRelease(null) }}>Edit</button>
              <button className="btn btn-secondary" onClick={() => setViewRelease(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="rel-hero">
        <div>
          <h1>🚀 Release Tracking</h1>
          <p className="rel-subtitle">Track releases, deployments, and fixes across services.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddForm}>+ Add Release</button>
      </div>

      {/* FORM */}
      {showForm && (
        <section className="card rel-form-section">
          <div className="rel-form-header">
            <h2>{isEditing ? '✏️ Edit Release' : '➕ New Release'}</h2>
            <button className="btn btn-sm btn-secondary" onClick={closeForm}>✕ Close</button>
          </div>

          <div className="rel-form-grid">
            <div className="form-group">
              <label>Release Date *</label>
              <input type="text" className="form-control" placeholder="20260609" value={formRelease.releaseDate} onChange={e => setFormRelease({ ...formRelease, releaseDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Name *</label>
              <input type="text" className="form-control" placeholder="R.2.0.1" value={formRelease.name} onChange={e => setFormRelease({ ...formRelease, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Filename</label>
              <input type="text" className="form-control" placeholder="release_20260618_R_2_0_1_5.md" value={formRelease.filename} onChange={e => setFormRelease({ ...formRelease, filename: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea className="form-control" rows={2} placeholder="Release description..." value={formRelease.description} onChange={e => setFormRelease({ ...formRelease, description: e.target.value })} />
          </div>

          {/* Deployments */}
          <div className="rel-deployments-header">
            <h3>Deployments ({formRelease.deployments.length})</h3>
            <button className="btn btn-sm btn-primary" onClick={addDeployment}>+ Add Deployment</button>
          </div>

          {formRelease.deployments.map((dep, di) => (
            <div key={di} className="rel-deployment-card">
              <div className="rel-dep-card-header">
                <span>Deployment #{di + 1}</span>
                <button className="btn btn-sm btn-danger" onClick={() => removeDeployment(di)}>Remove</button>
              </div>

              <div className="rel-dep-grid">
                <div className="form-group">
                  <label>Service</label>
                  <select className="form-control" value={dep.serviceName} onChange={e => updateDeployment(di, 'serviceName', e.target.value)}>
                    <option value="">-- Select --</option>
                    {SERVICE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Env</label>
                  <select className="form-control" value={dep.env} onChange={e => updateDeployment(di, 'env', e.target.value)}>
                    <option value="">-- Select --</option>
                    {ENV_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Wilfy Config</label>
                  <input type="text" className="form-control" value={dep.wilfyConfig} onChange={e => updateDeployment(di, 'wilfyConfig', e.target.value)} />
                </div>
              </div>

              <div className="rel-dep-grid">
                <div className="form-group">
                  <label>Interface Current</label>
                  <input type="text" className="form-control" value={dep.interfaceCurrent} onChange={e => updateDeployment(di, 'interfaceCurrent', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Interface Speed</label>
                  <input type="text" className="form-control" value={dep.interfaceSpeed} onChange={e => updateDeployment(di, 'interfaceSpeed', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Service Current</label>
                  <input type="text" className="form-control" value={dep.serviceCurrent} onChange={e => updateDeployment(di, 'serviceCurrent', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Service Speed</label>
                  <input type="text" className="form-control" value={dep.serviceSpeed} onChange={e => updateDeployment(di, 'serviceSpeed', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Deployment Current</label>
                  <input type="text" className="form-control" value={dep.deploymentCurrent} onChange={e => updateDeployment(di, 'deploymentCurrent', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Deployment Speed</label>
                  <input type="text" className="form-control" value={dep.deploymentSpeed} onChange={e => updateDeployment(di, 'deploymentSpeed', e.target.value)} />
                </div>
              </div>

              {/* Fixes */}
              <div className="rel-fixes-header">
                <strong>Fixes ({dep.fixes.length})</strong>
                <button className="btn btn-sm btn-secondary" onClick={() => addFix(di)}>+ Fix</button>
              </div>
              {dep.fixes.map((fix, fi) => (
                <div key={fi} className="rel-fix-row">
                  <input type="text" className="form-control" placeholder="JIRA ID" value={fix.jiraId} onChange={e => updateFix(di, fi, 'jiraId', e.target.value)} />
                  <input type="text" className="form-control" placeholder="Description" value={fix.description} onChange={e => updateFix(di, fi, 'description', e.target.value)} />
                  <button className="btn btn-sm btn-danger" onClick={() => removeFix(di, fi)}>×</button>
                </div>
              ))}
            </div>
          ))}

          <div className="rel-form-actions">
            <button className="btn btn-primary" onClick={saveRelease} disabled={isLoading}>{isEditing ? 'Update' : 'Save'}</button>
            <button className="btn btn-secondary" onClick={closeForm}>Cancel</button>
          </div>
        </section>
      )}

      {/* FILTER & LIST */}
      <section className="card rel-list-section">
        <div className="rel-list-header">
          <h2>Releases</h2>
          <div className="rel-filter-row">
            <input type="text" className="form-control" placeholder="Search name, date, description..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-secondary btn-sm" onClick={loadReleases}>Reload</button>
          </div>
        </div>

        {isLoading && <div className="loading-text"><strong>Loading...</strong></div>}

        {filteredReleases.length === 0 && !isLoading ? (
          <div className="rel-empty"><p>No releases found.</p><button className="btn btn-primary" onClick={openAddForm}>+ Add Release</button></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="rel-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Deployments</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedReleases.map((r, i) => (
                    <tr key={r.id ?? i}>
                      <td className="rel-date-cell">{r.releaseDate}</td>
                      <td className="rel-name-cell">{r.name}</td>
                      <td className="rel-desc-cell">{r.description}</td>
                      <td>{r.deployments?.length || 0} service(s)</td>
                      <td className="rel-actions">
                        <button className="btn btn-sm btn-info" onClick={() => setViewRelease(r)}>View</button>
                        <button className="btn btn-sm btn-warning" onClick={() => openEditForm(r)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteRelease(r)}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="rel-pagination">
                <span>Page {currentPage} of {totalPages}</span>
                <div className="rel-pagination-buttons">
                  <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>← Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button key={page} className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-light'}`} onClick={() => setCurrentPage(page)}>{page}</button>
                  ))}
                  <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default Releases
