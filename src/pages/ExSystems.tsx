import { useState, useEffect, useCallback } from 'react'
import '../css/ExSystems.css'

interface SearchLocation {
  countryName: string
  countryCode: string
  cityName: string
  cityCode: string
}

interface SearchCriteria {
  id: number | null
  systemId: number | null
  from: SearchLocation
  to: SearchLocation
  date: string
}

interface LogicNote {
  id: number | null
  systemId: number | null
  title: string
  content: string
  createdAt: string
}

interface SystemNote {
  id: number | null
  systemId: number | null
  title: string
  content: string
  createdAt: string
}

interface ExSystem {
  id: number | null
  system: string
  country: string
  completionSystem: string
  completionSystemCode: string
  searchCriterias: SearchCriteria[]
  logicNotes: LogicNote[]
  notes: SystemNote[]
}

const API_BASE = '/api/ex-systems'

function getEmptyLocation(): SearchLocation {
  return { countryName: '', countryCode: '', cityName: '', cityCode: '' }
}

function getEmptySearchCriteria(systemId: number | null): SearchCriteria {
  return { id: null, systemId, from: getEmptyLocation(), to: getEmptyLocation(), date: '' }
}

function getEmptyLogicNote(systemId: number | null): LogicNote {
  return { id: null, systemId, title: '', content: '', createdAt: new Date().toISOString().split('T')[0] }
}

function getEmptyNote(systemId: number | null): SystemNote {
  return { id: null, systemId, title: '', content: '', createdAt: new Date().toISOString().split('T')[0] }
}

function getEmptySystem(): ExSystem {
  return {
    id: null,
    system: '',
    country: '',
    completionSystem: '',
    completionSystemCode: '',
    searchCriterias: [],
    logicNotes: [],
    notes: [],
  }
}

function ExSystems() {
  const [systems, setSystems] = useState<ExSystem[]>([])
  const [selectedSystem, setSelectedSystem] = useState<ExSystem | null>(null)
  const [showSystemForm, setShowSystemForm] = useState(false)
  const [formSystem, setFormSystem] = useState<ExSystem>(getEmptySystem())
  const [isEditingSystem, setIsEditingSystem] = useState(false)

  // Sub-item forms
  const [showSearchForm, setShowSearchForm] = useState(false)
  const [formSearch, setFormSearch] = useState<SearchCriteria>(getEmptySearchCriteria(null))
  const [isEditingSearch, setIsEditingSearch] = useState(false)

  const [showLogicNoteForm, setShowLogicNoteForm] = useState(false)
  const [formLogicNote, setFormLogicNote] = useState<LogicNote>(getEmptyLogicNote(null))
  const [isEditingLogicNote, setIsEditingLogicNote] = useState(false)

  const [showNoteForm, setShowNoteForm] = useState(false)
  const [formNote, setFormNote] = useState<SystemNote>(getEmptyNote(null))
  const [isEditingNote, setIsEditingNote] = useState(false)

  // Active tab for selected system
  const [activeTab, setActiveTab] = useState<'search' | 'logic' | 'notes'>('search')

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const clearMessages = () => { setSuccessMessage(''); setErrorMessage('') }
  const showSuccess = (msg: string) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(''), 3000) }
  const showError = (msg: string) => { setErrorMessage(msg); setTimeout(() => setErrorMessage(''), 4000) }

  // Load systems
  const loadSystems = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/list`)
      if (!response.ok) throw new Error('API error')
      const data = await response.json()
      setSystems(data.data || data || [])
    } catch {
      setSystems([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadSystemDetail = useCallback(async (id: number) => {
    try {
      const response = await fetch(`${API_BASE}/${id}`)
      if (!response.ok) throw new Error('API error')
      const data = await response.json()
      setSelectedSystem(data.data || data)
    } catch {
      showError('Failed to load system details')
    }
  }, [])

  useEffect(() => { loadSystems() }, [loadSystems])

  // System CRUD
  const openAddSystem = () => {
    clearMessages()
    setFormSystem(getEmptySystem())
    setIsEditingSystem(false)
    setShowSystemForm(true)
  }

  const openEditSystem = (sys: ExSystem) => {
    clearMessages()
    setFormSystem({ ...sys })
    setIsEditingSystem(true)
    setShowSystemForm(true)
  }

  const saveSystem = async () => {
    clearMessages()
    if (!formSystem.system.trim()) { showError('System name is required'); return }
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formSystem.id,
          system: formSystem.system,
          country: formSystem.country,
          completionSystem: formSystem.completionSystem,
          completionSystemCode: formSystem.completionSystemCode,
        }),
      })
      if (!response.ok) throw new Error('Save failed')
      showSuccess(isEditingSystem ? 'System updated' : 'System added')
      setShowSystemForm(false)
      loadSystems()
      if (selectedSystem && formSystem.id === selectedSystem.id) {
        loadSystemDetail(selectedSystem.id!)
      }
    } catch {
      showError('Failed to save system')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteSystem = async (sys: ExSystem) => {
    if (!sys.id) return
    if (!confirm(`Delete system "${sys.system}"?`)) return
    try {
      const response = await fetch(`${API_BASE}/delete/${sys.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
      showSuccess('System deleted')
      if (selectedSystem?.id === sys.id) setSelectedSystem(null)
      loadSystems()
    } catch {
      showError('Failed to delete system')
    }
  }

  const selectSystem = (sys: ExSystem) => {
    clearMessages()
    if (sys.id) loadSystemDetail(sys.id)
  }

  // Search Criteria CRUD
  const openAddSearch = () => {
    clearMessages()
    setFormSearch(getEmptySearchCriteria(selectedSystem?.id || null))
    setIsEditingSearch(false)
    setShowSearchForm(true)
  }

  const openEditSearch = (sc: SearchCriteria) => {
    clearMessages()
    setFormSearch({ ...sc, from: { ...sc.from }, to: { ...sc.to } })
    setIsEditingSearch(true)
    setShowSearchForm(true)
  }

  const saveSearch = async () => {
    clearMessages()
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/search-criteria/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formSearch, systemId: selectedSystem?.id }),
      })
      if (!response.ok) throw new Error('Save failed')
      showSuccess(isEditingSearch ? 'Search criteria updated' : 'Search criteria added')
      setShowSearchForm(false)
      if (selectedSystem?.id) loadSystemDetail(selectedSystem.id)
    } catch {
      showError('Failed to save search criteria')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteSearch = async (sc: SearchCriteria) => {
    if (!sc.id) return
    if (!confirm('Delete this search criteria?')) return
    try {
      const response = await fetch(`${API_BASE}/search-criteria/delete/${sc.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
      showSuccess('Search criteria deleted')
      if (selectedSystem?.id) loadSystemDetail(selectedSystem.id)
    } catch {
      showError('Failed to delete')
    }
  }

  // Logic Notes CRUD
  const openAddLogicNote = () => {
    clearMessages()
    setFormLogicNote(getEmptyLogicNote(selectedSystem?.id || null))
    setIsEditingLogicNote(false)
    setShowLogicNoteForm(true)
  }

  const openEditLogicNote = (note: LogicNote) => {
    clearMessages()
    setFormLogicNote({ ...note })
    setIsEditingLogicNote(true)
    setShowLogicNoteForm(true)
  }

  const saveLogicNote = async () => {
    clearMessages()
    if (!formLogicNote.title.trim()) { showError('Title is required'); return }
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/logic-notes/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formLogicNote, systemId: selectedSystem?.id }),
      })
      if (!response.ok) throw new Error('Save failed')
      showSuccess(isEditingLogicNote ? 'Logic note updated' : 'Logic note added')
      setShowLogicNoteForm(false)
      if (selectedSystem?.id) loadSystemDetail(selectedSystem.id)
    } catch {
      showError('Failed to save logic note')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteLogicNote = async (note: LogicNote) => {
    if (!note.id) return
    if (!confirm('Delete this logic note?')) return
    try {
      const response = await fetch(`${API_BASE}/logic-notes/delete/${note.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
      showSuccess('Logic note deleted')
      if (selectedSystem?.id) loadSystemDetail(selectedSystem.id)
    } catch {
      showError('Failed to delete')
    }
  }

  // Notes CRUD
  const openAddNote = () => {
    clearMessages()
    setFormNote(getEmptyNote(selectedSystem?.id || null))
    setIsEditingNote(false)
    setShowNoteForm(true)
  }

  const openEditNote = (note: SystemNote) => {
    clearMessages()
    setFormNote({ ...note })
    setIsEditingNote(true)
    setShowNoteForm(true)
  }

  const saveNote = async () => {
    clearMessages()
    if (!formNote.title.trim()) { showError('Title is required'); return }
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/notes/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formNote, systemId: selectedSystem?.id }),
      })
      if (!response.ok) throw new Error('Save failed')
      showSuccess(isEditingNote ? 'Note updated' : 'Note added')
      setShowNoteForm(false)
      if (selectedSystem?.id) loadSystemDetail(selectedSystem.id)
    } catch {
      showError('Failed to save note')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteNote = async (note: SystemNote) => {
    if (!note.id) return
    if (!confirm('Delete this note?')) return
    try {
      const response = await fetch(`${API_BASE}/notes/delete/${note.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
      showSuccess('Note deleted')
      if (selectedSystem?.id) loadSystemDetail(selectedSystem.id)
    } catch {
      showError('Failed to delete')
    }
  }

  return (
    <div className="exsys-container">
      {/* TOAST */}
      {(errorMessage || successMessage) && (
        <div className="exsys-toast-overlay">
          <div className={`exsys-toast ${errorMessage ? 'exsys-toast-error' : 'exsys-toast-success'}`}>
            <span>{errorMessage || successMessage}</span>
            <button className="exsys-toast-close" onClick={clearMessages}>×</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="exsys-hero">
        <div>
          <h1>🖥️ External Systems</h1>
          <p className="exsys-subtitle">Notes, search criteria, and logic for external systems.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddSystem}>+ Add System</button>
      </div>

      {/* SYSTEM FORM */}
      {showSystemForm && (
        <section className="card exsys-form-section">
          <div className="exsys-form-header">
            <h2>{isEditingSystem ? '✏️ Edit System' : '➕ New System'}</h2>
            <div className="exsys-form-header-actions">
              <button className="btn btn-primary btn-sm" onClick={saveSystem} disabled={isLoading}>
                {isEditingSystem ? '✓ Update' : '✓ Save'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowSystemForm(false)}>✕ Cancel</button>
            </div>
          </div>
          <div className="exsys-form-grid">
            <div className="form-group">
              <label>System Name *</label>
              <input type="text" className="form-control" placeholder="renfe" value={formSystem.system} onChange={e => setFormSystem({ ...formSystem, system: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Country</label>
              <input type="text" className="form-control" placeholder="Spain" value={formSystem.country} onChange={e => setFormSystem({ ...formSystem, country: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Completion System</label>
              <input type="text" className="form-control" placeholder="" value={formSystem.completionSystem} onChange={e => setFormSystem({ ...formSystem, completionSystem: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Completion System Code</label>
              <input type="text" className="form-control" placeholder="212" value={formSystem.completionSystemCode} onChange={e => setFormSystem({ ...formSystem, completionSystemCode: e.target.value })} />
            </div>
          </div>
        </section>
      )}

      <div className="exsys-layout">
        {/* SYSTEM LIST - LEFT PANEL */}
        <aside className="exsys-sidebar">
          <h3>Systems</h3>
          {isLoading && <p className="exsys-loading">Loading...</p>}
          {systems.length === 0 && !isLoading && <p className="exsys-empty">No systems yet.</p>}
          {systems.map((sys, i) => (
            <div
              key={sys.id ?? i}
              className={`exsys-sys-item ${selectedSystem?.id === sys.id ? 'active' : ''}`}
              onClick={() => selectSystem(sys)}
            >
              <div className="exsys-sys-info">
                <strong>{sys.system}</strong>
                <span className="exsys-sys-country">{sys.country}</span>
              </div>
              <div className="exsys-sys-actions">
                <button className="btn btn-sm btn-warning" onClick={(e) => { e.stopPropagation(); openEditSystem(sys) }}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); deleteSystem(sys) }}>Del</button>
              </div>
            </div>
          ))}
        </aside>

        {/* DETAIL - RIGHT PANEL */}
        <main className="exsys-detail">
          {!selectedSystem ? (
            <div className="exsys-no-selection">
              <p>Select a system from the left to view details.</p>
            </div>
          ) : (
            <>
              <div className="exsys-detail-header">
                <h2>{selectedSystem.system}</h2>
                <span className="exsys-detail-country">{selectedSystem.country}</span>
                {selectedSystem.completionSystemCode && (
                  <span className="exsys-detail-code">Code: {selectedSystem.completionSystemCode}</span>
                )}
              </div>

              {/* TABS */}
              <div className="exsys-tabs">
                <button className={`exsys-tab ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
                  Search Criteria ({selectedSystem.searchCriterias?.length || 0})
                </button>
                <button className={`exsys-tab ${activeTab === 'logic' ? 'active' : ''}`} onClick={() => setActiveTab('logic')}>
                  Logic Notes ({selectedSystem.logicNotes?.length || 0})
                </button>
                <button className={`exsys-tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
                  Notes ({selectedSystem.notes?.length || 0})
                </button>
              </div>

              {/* SEARCH CRITERIA TAB */}
              {activeTab === 'search' && (
                <div className="exsys-tab-content">
                  <button className="btn btn-primary btn-sm" onClick={openAddSearch}>+ Add Search Criteria</button>

                  {showSearchForm && (
                    <div className="exsys-sub-form">
                      <h4>{isEditingSearch ? 'Edit' : 'New'} Search Criteria</h4>
                      <div className="exsys-search-grid">
                        <fieldset className="exsys-fieldset">
                          <legend>From</legend>
                          <div className="exsys-loc-grid">
                            <input type="text" className="form-control" placeholder="Country name" value={formSearch.from.countryName} onChange={e => setFormSearch({ ...formSearch, from: { ...formSearch.from, countryName: e.target.value } })} />
                            <input type="text" className="form-control" placeholder="Code" value={formSearch.from.countryCode} onChange={e => setFormSearch({ ...formSearch, from: { ...formSearch.from, countryCode: e.target.value } })} />
                            <input type="text" className="form-control" placeholder="City name" value={formSearch.from.cityName} onChange={e => setFormSearch({ ...formSearch, from: { ...formSearch.from, cityName: e.target.value } })} />
                            <input type="text" className="form-control" placeholder="City code" value={formSearch.from.cityCode} onChange={e => setFormSearch({ ...formSearch, from: { ...formSearch.from, cityCode: e.target.value } })} />
                          </div>
                        </fieldset>
                        <fieldset className="exsys-fieldset">
                          <legend>To</legend>
                          <div className="exsys-loc-grid">
                            <input type="text" className="form-control" placeholder="Country name" value={formSearch.to.countryName} onChange={e => setFormSearch({ ...formSearch, to: { ...formSearch.to, countryName: e.target.value } })} />
                            <input type="text" className="form-control" placeholder="Code" value={formSearch.to.countryCode} onChange={e => setFormSearch({ ...formSearch, to: { ...formSearch.to, countryCode: e.target.value } })} />
                            <input type="text" className="form-control" placeholder="City name" value={formSearch.to.cityName} onChange={e => setFormSearch({ ...formSearch, to: { ...formSearch.to, cityName: e.target.value } })} />
                            <input type="text" className="form-control" placeholder="City code" value={formSearch.to.cityCode} onChange={e => setFormSearch({ ...formSearch, to: { ...formSearch.to, cityCode: e.target.value } })} />
                          </div>
                        </fieldset>
                      </div>
                      <div className="form-group" style={{ maxWidth: 200, marginTop: 10 }}>
                        <label>Date</label>
                        <input type="text" className="form-control" placeholder="2026-07-01" value={formSearch.date} onChange={e => setFormSearch({ ...formSearch, date: e.target.value })} />
                      </div>
                      <div className="exsys-sub-form-actions">
                        <button className="btn btn-primary btn-sm" onClick={saveSearch} disabled={isLoading}>{isEditingSearch ? 'Update' : 'Save'}</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowSearchForm(false)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {(selectedSystem.searchCriterias?.length || 0) === 0 && !showSearchForm && (
                    <p className="exsys-empty">No search criteria added yet.</p>
                  )}

                  {selectedSystem.searchCriterias?.map((sc, i) => (
                    <div key={sc.id ?? i} className="exsys-card">
                      <div className="exsys-card-row">
                        <span><strong>From:</strong> {sc.from.cityName || sc.from.countryName} ({sc.from.cityCode || sc.from.countryCode})</span>
                        <span><strong>To:</strong> {sc.to.cityName || sc.to.countryName} ({sc.to.cityCode || sc.to.countryCode})</span>
                        {sc.date && <span><strong>Date:</strong> {sc.date}</span>}
                      </div>
                      <div className="exsys-card-actions">
                        <button className="btn btn-sm btn-warning" onClick={() => openEditSearch(sc)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteSearch(sc)}>Del</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* LOGIC NOTES TAB */}
              {activeTab === 'logic' && (
                <div className="exsys-tab-content">
                  <button className="btn btn-primary btn-sm" onClick={openAddLogicNote}>+ Add Logic Note</button>

                  {showLogicNoteForm && (
                    <div className="exsys-sub-form">
                      <h4>{isEditingLogicNote ? 'Edit' : 'New'} Logic Note</h4>
                      <div className="form-group">
                        <label>Title *</label>
                        <input type="text" className="form-control" placeholder="Logic title" value={formLogicNote.title} onChange={e => setFormLogicNote({ ...formLogicNote, title: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Content</label>
                        <textarea className="form-control" rows={5} placeholder="Describe the logic..." value={formLogicNote.content} onChange={e => setFormLogicNote({ ...formLogicNote, content: e.target.value })} />
                      </div>
                      <div className="exsys-sub-form-actions">
                        <button className="btn btn-primary btn-sm" onClick={saveLogicNote} disabled={isLoading}>{isEditingLogicNote ? 'Update' : 'Save'}</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowLogicNoteForm(false)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {(selectedSystem.logicNotes?.length || 0) === 0 && !showLogicNoteForm && (
                    <p className="exsys-empty">No logic notes added yet.</p>
                  )}

                  {selectedSystem.logicNotes?.map((note, i) => (
                    <div key={note.id ?? i} className="exsys-note-card">
                      <div className="exsys-note-header">
                        <strong>{note.title}</strong>
                        <span className="exsys-note-date">{note.createdAt}</span>
                      </div>
                      <p className="exsys-note-content">{note.content}</p>
                      <div className="exsys-card-actions">
                        <button className="btn btn-sm btn-warning" onClick={() => openEditLogicNote(note)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteLogicNote(note)}>Del</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* NOTES TAB */}
              {activeTab === 'notes' && (
                <div className="exsys-tab-content">
                  <button className="btn btn-primary btn-sm" onClick={openAddNote}>+ Add Note</button>

                  {showNoteForm && (
                    <div className="exsys-sub-form">
                      <h4>{isEditingNote ? 'Edit' : 'New'} Note</h4>
                      <div className="form-group">
                        <label>Title *</label>
                        <input type="text" className="form-control" placeholder="Note title" value={formNote.title} onChange={e => setFormNote({ ...formNote, title: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Content</label>
                        <textarea className="form-control" rows={5} placeholder="Write your note..." value={formNote.content} onChange={e => setFormNote({ ...formNote, content: e.target.value })} />
                      </div>
                      <div className="exsys-sub-form-actions">
                        <button className="btn btn-primary btn-sm" onClick={saveNote} disabled={isLoading}>{isEditingNote ? 'Update' : 'Save'}</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowNoteForm(false)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {(selectedSystem.notes?.length || 0) === 0 && !showNoteForm && (
                    <p className="exsys-empty">No notes added yet.</p>
                  )}

                  {selectedSystem.notes?.map((note, i) => (
                    <div key={note.id ?? i} className="exsys-note-card">
                      <div className="exsys-note-header">
                        <strong>{note.title}</strong>
                        <span className="exsys-note-date">{note.createdAt}</span>
                      </div>
                      <p className="exsys-note-content">{note.content}</p>
                      <div className="exsys-card-actions">
                        <button className="btn btn-sm btn-warning" onClick={() => openEditNote(note)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteNote(note)}>Del</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default ExSystems
