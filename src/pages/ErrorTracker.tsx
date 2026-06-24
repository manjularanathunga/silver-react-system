import { useState, useEffect, useCallback } from 'react'
import '../css/ErrorTracker.css'

interface ErrorRecord {
  id: number | null
  errorCode: string
  error: string
  description: string
  notes: string
  service: string
  environment: string
  source: string
  seenDates: string[]
  jiraIds: string[]
}

const API_BASE = '/api/errors'

const SERVICES = ['gtsales', 'storage', 'retrival', 'payment', 'customer', 'vt2']
const ENVIRONMENTS = ['q', 'r', 'a', 'o']
const SOURCES = ['terror', 'opensearch', 'cloudwatch']

const PAGE_SIZE = 10

function getEmptyRecord(): ErrorRecord {
  return {
    id: null,
    errorCode: '',
    error: '',
    description: '',
    notes: '',
    service: '',
    environment: '',
    source: '',
    seenDates: [],
    jiraIds: [],
  }
}

function ErrorTracker() {
  const [records, setRecords] = useState<ErrorRecord[]>([])
  const [formRecord, setFormRecord] = useState<ErrorRecord>(getEmptyRecord())
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [search, setSearch] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [envFilter, setEnvFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')

  // View detail popup
  const [viewRecord, setViewRecord] = useState<ErrorRecord | null>(null)

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Temp inputs for array fields
  const [newSeenDate, setNewSeenDate] = useState('')
  const [newJiraId, setNewJiraId] = useState('')

  const clearMessages = () => {
    setSuccessMessage('')
    setErrorMessage('')
  }

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const showError = (msg: string) => {
    setErrorMessage(msg)
    setTimeout(() => setErrorMessage(''), 4000)
  }

  const loadRecords = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/list`)
      if (!response.ok) throw new Error('API error')
      const data = await response.json()
      setRecords(data.data || data || [])
    } catch {
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const openAddForm = () => {
    setFormRecord(getEmptyRecord())
    setIsEditing(false)
    setShowForm(true)
    clearMessages()
  }

  const openEditForm = (record: ErrorRecord) => {
    setFormRecord({ ...record })
    setIsEditing(true)
    setShowForm(true)
    clearMessages()
  }

  const closeForm = () => {
    setShowForm(false)
    setFormRecord(getEmptyRecord())
  }

  const saveRecord = async () => {
    clearMessages()

    if (!formRecord.errorCode.trim()) {
      showError('Error code is required')
      return
    }
    if (!formRecord.error.trim()) {
      showError('Error message is required')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formRecord),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Save failed')
      showSuccess(isEditing ? 'Error record updated' : 'Error record saved')
      setShowForm(false)
      setFormRecord(getEmptyRecord())
      loadRecords()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteRecord = async (record: ErrorRecord) => {
    if (!record.id) return
    if (!confirm(`Delete error "${record.errorCode}"?`)) return

    try {
      const response = await fetch(`${API_BASE}/delete/${record.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
      showSuccess('Record deleted')
      loadRecords()
    } catch {
      showError('Failed to delete')
    }
  }

  // Array field helpers
  const addSeenDate = () => {
    if (!newSeenDate) return
    setFormRecord((prev) => ({
      ...prev,
      seenDates: [...prev.seenDates, newSeenDate],
    }))
    setNewSeenDate('')
  }

  const removeSeenDate = (index: number) => {
    setFormRecord((prev) => ({
      ...prev,
      seenDates: prev.seenDates.filter((_, i) => i !== index),
    }))
  }

  const addJiraId = () => {
    if (!newJiraId.trim()) return
    setFormRecord((prev) => ({
      ...prev,
      jiraIds: [...prev.jiraIds, newJiraId.trim()],
    }))
    setNewJiraId('')
  }

  const removeJiraId = (index: number) => {
    setFormRecord((prev) => ({
      ...prev,
      jiraIds: prev.jiraIds.filter((_, i) => i !== index),
    }))
  }

  // Filtering
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      !search ||
      r.errorCode.toLowerCase().includes(search.toLowerCase()) ||
      r.error.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
    const matchesService = !serviceFilter || r.service === serviceFilter
    const matchesEnv = !envFilter || r.environment === envFilter
    const matchesSource = !sourceFilter || r.source === sourceFilter
    return matchesSearch && matchesService && matchesEnv && matchesSource
  })

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE) || 1
  const pagedRecords = filteredRecords.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [search, serviceFilter, envFilter, sourceFilter])

  return (
    <div className="error-tracker-container">
      {/* TOAST */}
      {(errorMessage || successMessage) && (
        <div className="et-toast-overlay">
          <div className={`et-toast ${errorMessage ? 'et-toast-error' : 'et-toast-success'}`}>
            <span>{errorMessage || successMessage}</span>
            <button className="et-toast-close" onClick={clearMessages}>×</button>
          </div>
        </div>
      )}

      {/* VIEW DETAIL MODAL */}
      {viewRecord && (
        <div className="et-modal-overlay" onClick={() => setViewRecord(null)}>
          <div className="et-modal" onClick={(e) => e.stopPropagation()}>
            <div className="et-modal-header">
              <h3>Error Details</h3>
              <button className="et-modal-close" onClick={() => setViewRecord(null)}>×</button>
            </div>

            <div className="et-detail-grid">
              <div className="et-detail-row">
                <span className="et-detail-label">Error Code</span>
                <span className="et-detail-value et-code-cell">{viewRecord.errorCode}</span>
              </div>
              <div className="et-detail-row">
                <span className="et-detail-label">Error</span>
                <span className="et-detail-value">{viewRecord.error}</span>
              </div>
              <div className="et-detail-row">
                <span className="et-detail-label">Service</span>
                <span className="et-detail-value">
                  <span className="et-badge et-badge-service">{viewRecord.service}</span>
                </span>
              </div>
              <div className="et-detail-row">
                <span className="et-detail-label">Environment</span>
                <span className="et-detail-value">
                  <span className="et-badge et-badge-env">{viewRecord.environment?.toUpperCase()}</span>
                </span>
              </div>
              <div className="et-detail-row">
                <span className="et-detail-label">Source</span>
                <span className="et-detail-value">
                  <span className="et-badge et-badge-source">{viewRecord.source}</span>
                </span>
              </div>
            </div>

            <div className="et-detail-section">
              <span className="et-detail-label">Description</span>
              <p className="et-detail-text">{viewRecord.description || '—'}</p>
            </div>

            <div className="et-detail-section">
              <span className="et-detail-label">Notes</span>
              <p className="et-detail-text">{viewRecord.notes || '—'}</p>
            </div>

            <div className="et-detail-section">
              <span className="et-detail-label">Seen Dates ({viewRecord.seenDates?.length || 0})</span>
              <div className="et-detail-tags">
                {viewRecord.seenDates?.length > 0
                  ? viewRecord.seenDates.map((d, i) => (
                      <span key={i} className="et-tag">{d}</span>
                    ))
                  : <span className="et-detail-empty">No dates recorded</span>
                }
              </div>
            </div>

            <div className="et-detail-section">
              <span className="et-detail-label">JIRA IDs ({viewRecord.jiraIds?.length || 0})</span>
              <div className="et-detail-tags">
                {viewRecord.jiraIds?.length > 0
                  ? viewRecord.jiraIds.map((jid, i) => (
                      <span key={i} className="et-tag et-tag-jira">{jid}</span>
                    ))
                  : <span className="et-detail-empty">No JIRAs linked</span>
                }
              </div>
            </div>

            <div className="et-modal-footer">
              <button className="btn btn-warning" onClick={() => { openEditForm(viewRecord); setViewRecord(null); }}>
                Edit
              </button>
              <button className="btn btn-secondary" onClick={() => setViewRecord(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="et-hero">
        <div>
          <h1>🐛 Error Tracker</h1>
          <p className="et-subtitle">Search, track, and manage error information across services and environments.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddForm}>
          + Add Error
        </button>
      </div>

      {/* STATS */}
      <div className="et-stats">
        <div className="et-stat-item">
          <span className="et-stat-number">{records.length}</span>
          <span className="et-stat-label">Total Errors</span>
        </div>
        <div className="et-stat-item">
          <span className="et-stat-number">{new Set(records.map((r) => r.service)).size}</span>
          <span className="et-stat-label">Services</span>
        </div>
        <div className="et-stat-item">
          <span className="et-stat-number">{new Set(records.map((r) => r.environment)).size}</span>
          <span className="et-stat-label">Environments</span>
        </div>
      </div>

      {/* ADD / EDIT FORM */}
      {showForm && (
        <section className="card et-form-section">
          <div className="et-form-header">
            <h2>{isEditing ? '✏️ Edit Error' : '➕ Add Error'}</h2>
            <button className="btn btn-sm btn-secondary" onClick={closeForm}>✕ Close</button>
          </div>

          <div className="et-form-grid">
            <div className="form-group">
              <label>Error Code *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. ERR-5001"
                value={formRecord.errorCode}
                onChange={(e) => setFormRecord({ ...formRecord, errorCode: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Error *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Error message"
                value={formRecord.error}
                onChange={(e) => setFormRecord({ ...formRecord, error: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Service</label>
              <select
                className="form-control"
                value={formRecord.service}
                onChange={(e) => setFormRecord({ ...formRecord, service: e.target.value })}
              >
                <option value="">-- Select --</option>
                {SERVICES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Environment</label>
              <select
                className="form-control"
                value={formRecord.environment}
                onChange={(e) => setFormRecord({ ...formRecord, environment: e.target.value })}
              >
                <option value="">-- Select --</option>
                {ENVIRONMENTS.map((e) => (
                  <option key={e} value={e}>{e.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Source</label>
              <select
                className="form-control"
                value={formRecord.source}
                onChange={(e) => setFormRecord({ ...formRecord, source: e.target.value })}
              >
                <option value="">-- Select --</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Describe the error..."
              value={formRecord.description}
              onChange={(e) => setFormRecord({ ...formRecord, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Resolution steps, workarounds, etc."
              value={formRecord.notes}
              onChange={(e) => setFormRecord({ ...formRecord, notes: e.target.value })}
            />
          </div>

          {/* Seen Dates */}
          <div className="et-array-section">
            <label>Seen Dates</label>
            <div className="et-array-input">
              <input
                type="date"
                className="form-control"
                value={newSeenDate}
                onChange={(e) => setNewSeenDate(e.target.value)}
              />
              <button className="btn btn-sm btn-primary" onClick={addSeenDate}>Add</button>
            </div>
            <div className="et-tags">
              {formRecord.seenDates.map((date, i) => (
                <span key={i} className="et-tag">
                  {date}
                  <button className="et-tag-remove" onClick={() => removeSeenDate(i)}>×</button>
                </span>
              ))}
            </div>
          </div>

          {/* JIRA IDs */}
          <div className="et-array-section">
            <label>JIRA IDs</label>
            <div className="et-array-input">
              <input
                type="text"
                className="form-control"
                placeholder="e.g. PROJ-1234"
                value={newJiraId}
                onChange={(e) => setNewJiraId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addJiraId(); } }}
              />
              <button className="btn btn-sm btn-primary" onClick={addJiraId}>Add</button>
            </div>
            <div className="et-tags">
              {formRecord.jiraIds.map((jid, i) => (
                <span key={i} className="et-tag et-tag-jira">
                  {jid}
                  <button className="et-tag-remove" onClick={() => removeJiraId(i)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="et-form-actions">
            <button className="btn btn-primary" onClick={saveRecord} disabled={isLoading}>
              {isEditing ? 'Update' : 'Save'}
            </button>
            <button className="btn btn-secondary" onClick={closeForm}>Cancel</button>
          </div>
        </section>
      )}

      {/* FILTERS */}
      <section className="card et-filter-section">
        <div className="et-filter-row">
          <div className="form-group">
            <label>🔍 Search</label>
            <input
              type="text"
              className="form-control"
              placeholder="Code, error, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Service</label>
            <select className="form-control" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
              <option value="">All</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Env</label>
            <select className="form-control" value={envFilter} onChange={(e) => setEnvFilter(e.target.value)}>
              <option value="">All</option>
              {ENVIRONMENTS.map((e) => (
                <option key={e} value={e}>{e.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Source</label>
            <select className="form-control" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              <option value="">All</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="et-filter-actions">
            <button className="btn btn-secondary" onClick={() => { setSearch(''); setServiceFilter(''); setEnvFilter(''); setSourceFilter(''); }}>
              Reset
            </button>
          </div>
        </div>
      </section>

      {/* TABLE */}
      <section className="card et-list-section">
        <div className="et-list-header">
          <h2>Error List</h2>
          <span className="et-count">{filteredRecords.length} record(s)</span>
        </div>

        {isLoading && <div className="loading-text"><strong>Loading...</strong></div>}

        {filteredRecords.length === 0 && !isLoading ? (
          <div className="et-empty">
            <h3>No errors found</h3>
            <p>Add an error record to start tracking.</p>
            <button className="btn btn-primary" onClick={openAddForm}>+ Add Error</button>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="et-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Error</th>
                    <th>Service</th>
                    <th>Env</th>
                    <th>Source</th>
                    <th>Seen</th>
                    <th>JIRAs</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRecords.map((r, index) => (
                    <tr key={r.id ?? index}>
                      <td className="et-code-cell">{r.errorCode}</td>
                      <td className="et-error-cell">{r.error}</td>
                      <td><span className="et-badge et-badge-service">{r.service}</span></td>
                      <td><span className="et-badge et-badge-env">{r.environment?.toUpperCase()}</span></td>
                      <td><span className="et-badge et-badge-source">{r.source}</span></td>
                      <td className="et-dates-cell">
                        {r.seenDates?.length > 0 && (
                          <span title={r.seenDates.join(', ')}>{r.seenDates.length}x</span>
                        )}
                      </td>
                      <td className="et-jira-cell">
                        {r.jiraIds?.map((jid, i) => (
                          <span key={i} className="et-jira-tag">{jid}</span>
                        ))}
                      </td>
                      <td className="et-actions">
                        <button className="btn btn-sm btn-info" onClick={() => setViewRecord(r)}>View</button>
                        <button className="btn btn-sm btn-warning" onClick={() => openEditForm(r)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteRecord(r)}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="et-pagination">
                <span>Page {currentPage} of {totalPages}</span>
                <div className="et-pagination-buttons">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-light'}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default ErrorTracker
