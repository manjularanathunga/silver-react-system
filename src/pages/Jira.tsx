import { useState, useEffect, useCallback, useRef } from 'react'
import '../css/Jira.css'

interface JiraTask {
  jiraId: string
  title: string
  jiraLink: string
  folderLocation: string
  fileLocation: string
  jiraStatus: string
  createdDate: string
  completedDate: string | null
  readMeInfo: string
  showHideFlag: boolean
  priorityOngoing: number
}

const JIRA_STATUSES = [
  'Backlog',
  'Incoming',
  'Pending',
  'Q',
  'R',
  'A',
  'P',
  'Done',
]

const PRIORITIES = [1, 2, 3, 4, 5]

const PAGE_SIZE = 10

function getEmptyTask(): JiraTask {
  return {
    jiraId: '',
    title: '',
    jiraLink: '',
    folderLocation: '',
    fileLocation: '',
    jiraStatus: 'Backlog',
    createdDate: new Date().toISOString().split('T')[0],
    completedDate: null,
    readMeInfo: '',
    showHideFlag: false,
    priorityOngoing: 1,
  }
}

function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (error && typeof error === 'object') {
    const err = error as { data?: { message?: string } | string }
    if (err.data && typeof err.data === 'object' && err.data.message) {
      return err.data.message
    }
    if (typeof err.data === 'string') {
      return err.data
    }
  }
  return defaultMessage
}

function getRowClass(status: string): string {
  switch (status) {
    case 'Backlog':
      return 'row-backlog'
    case 'Incoming':
      return 'row-incoming'
    case 'Pending':
      return 'row-pending'
    case 'Q':
      return 'row-q'
    case 'R':
      return 'row-r'
    case 'A':
      return 'row-a'
    case 'P':
      return 'row-p'
    case 'Done':
      return 'row-done'
    default:
      return ''
  }
}

function Jira() {
  const [jiraTasks, setJiraTasks] = useState<JiraTask[]>([])
  const [jiraTask, setJiraTask] = useState<JiraTask>(getEmptyTask())
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [showListPane, setShowListPane] = useState(true)
  const [showEditPane, setShowEditPane] = useState(false)
  const [showNotesPane, setShowNotesPane] = useState(false)
  const [notesTask, setNotesTask] = useState<JiraTask | null>(null)
  const [notesContent, setNotesContent] = useState('')
  const [showAllRecords, setShowAllRecords] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [searchJiraId, setSearchJiraId] = useState('')
  const [searchTitle, setSearchTitle] = useState('')
  const [screenMode, setScreenMode] = useState('Add')

  const notesTextareaRef = useRef<HTMLTextAreaElement>(null)

  const insertFormatting = (prefix: string, suffix: string) => {
    const textarea = notesTextareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = notesContent.substring(start, end)
    const newText =
      notesContent.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      notesContent.substring(end)

    setNotesContent(newText)

    // Restore cursor position after state update
    setTimeout(() => {
      textarea.focus()
      const cursorPos = start + prefix.length + selectedText.length
      textarea.setSelectionRange(cursorPos, cursorPos)
    }, 0)
  }

  const resetMessages = () => {
    setErrorMessage('')
    setSuccessMessage('')
  }

  const resetForm = () => {
    setJiraTask(getEmptyTask())
    resetMessages()
  }

  const loadJiraList = useCallback(async () => {
    setIsLoading(true)
    resetMessages()
    try {
      const response = await fetch('/api/jira/list')
      const data = await response.json()
      if (!response.ok) throw { data }
      setJiraTasks(data.data || [])
      setCurrentPage(1)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to load JIRA list'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadJiraList()
  }, [loadJiraList])

  const addNewJira = () => {
    setScreenMode('Add')
    resetForm()
    setShowListPane(false)
    setShowEditPane(true)
  }

  const editJira = (task: JiraTask) => {
    setScreenMode('Edit')
    setJiraTask({ ...task })
    setShowListPane(false)
    setShowEditPane(true)
  }

  const backToList = () => {
    setShowListPane(true)
    setShowEditPane(false)
    setShowNotesPane(false)
    resetMessages()
  }

  const viewNotes = (task: JiraTask) => {
    setNotesTask({ ...task })
    setNotesContent(task.readMeInfo || '')
    setShowListPane(false)
    setShowEditPane(false)
    setShowNotesPane(true)
    resetMessages()
  }

  const saveNotes = async () => {
    if (!notesTask) return
    setIsLoading(true)
    resetMessages()
    const updated = { ...notesTask, readMeInfo: notesContent }
    try {
      const response = await fetch('/api/jira/updateJira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      const data = await response.json()
      if (!response.ok) throw { data }
      setSuccessMessage('Notes saved successfully')
      setNotesTask(updated)
      loadJiraList()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to save notes'))
    } finally {
      setIsLoading(false)
    }
  }

  const updateNotesStatus = (status: string) => {
    if (!notesTask) return
    setNotesTask({ ...notesTask, jiraStatus: status })
  }

  const createJira = async () => {
    setIsLoading(true)
    resetMessages()
    try {
      const response = await fetch('/api/jira/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jiraTask),
      })
      const data = await response.json()
      if (!response.ok) throw { data }
      setSuccessMessage(data.message)
      setJiraTask(data.data)
      loadJiraList()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to create JIRA task'))
    } finally {
      setIsLoading(false)
    }
  }

  const saveJira = async () => {
    setIsLoading(true)
    resetMessages()
    try {
      const response = await fetch('/api/jira/saveJira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jiraTask),
      })
      const data = await response.json()
      if (!response.ok) throw { data }
      setSuccessMessage(data.message)
      setJiraTask(data.data)
      loadJiraList()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to save JIRA task'))
    } finally {
      setIsLoading(false)
    }
  }

  const updateJira = async () => {
    setIsLoading(true)
    resetMessages()
    try {
      const response = await fetch('/api/jira/updateJira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jiraTask),
      })
      const data = await response.json()
      if (!response.ok) throw { data }
      setSuccessMessage(data.message)
      setJiraTask(data.data)
      loadJiraList()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to update JIRA task'))
    } finally {
      setIsLoading(false)
    }
  }

  const confirmDeleteJira = () => {
    if (!jiraTask || !jiraTask.jiraId) {
      alert('No JIRA task selected')
      return
    }
    const message =
      'Are you sure you want to delete this JIRA task?\n\n' +
      'JIRA ID : ' + jiraTask.jiraId + '\n' +
      'Title   : ' + (jiraTask.title || '') + '\n\n' +
      'This action cannot be undone.'

    if (confirm(message)) {
      deleteJira()
    }
  }

  const deleteJira = async () => {
    setIsLoading(true)
    resetMessages()
    try {
      const response = await fetch('/api/jira/deleteJira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jiraTask),
      })
      const data = await response.json()
      if (!response.ok) throw { data }
      setSuccessMessage(data.message)
      resetForm()
      setShowListPane(true)
      setShowEditPane(false)
      loadJiraList()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to delete JIRA task'))
    } finally {
      setIsLoading(false)
    }
  }

  const createFolders = async () => {
    setIsLoading(true)
    resetMessages()
    try {
      const response = await fetch('/api/jira/createFolders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jiraTask),
      })
      const data = await response.json()
      if (!response.ok) throw { data }
      setSuccessMessage(data.message)
      setJiraTask((prev) => ({ ...prev, folderLocation: data.data }))
      loadJiraList()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to create folder or file'))
    } finally {
      setIsLoading(false)
    }
  }

  const updateJiraPriority = async (task: JiraTask) => {
    resetMessages()
    try {
      const response = await fetch('/api/jira/updateJira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      })
      const data = await response.json()
      if (!response.ok) throw { data }
      setSuccessMessage(data.message)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to update priority'))
    }
  }

  const updateShowHideFlag = async (task: JiraTask, flag: boolean) => {
    const updated = { ...task, showHideFlag: flag }
    resetMessages()
    try {
      const response = await fetch('/api/jira/updateJira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      const data = await response.json()
      if (!response.ok) throw { data }
      setSuccessMessage(data.message)
      loadJiraList()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to update hide/unhide status'))
    }
  }

  const moveContent = async () => {
    setIsLoading(true)
    resetMessages()
    try {
      const response = await fetch('/api/jira/moveContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jiraTask),
      })
      const data = await response.json()
      if (!response.ok) throw { data }
      setSuccessMessage(data.message)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to move content'))
    } finally {
      setIsLoading(false)
    }
  }

  const changeStatus = async () => {
    setIsLoading(true)
    resetMessages()
    try {
      const response = await fetch('/api/jira/changeStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jiraTask),
      })
      const data = await response.json()
      if (!response.ok) throw { data }
      setSuccessMessage(data.message)
      setJiraTask(data.data)
      loadJiraList()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to change status'))
    } finally {
      setIsLoading(false)
    }
  }

  const copyJiraLink = (jiraLink: string) => {
    if (!jiraLink) {
      alert('No JIRA link available')
      return
    }
    navigator.clipboard
      .writeText(jiraLink)
      .then(() => alert('JIRA link copied'))
      .catch(() => alert('Failed to copy JIRA link'))
  }

  // Filtering & pagination
  const getVisibleJiraTasks = useCallback(() => {
    let filtered = jiraTasks

    if (!showAllRecords) {
      filtered = filtered.filter((task) => !task.showHideFlag)
    }

    if (searchJiraId) {
      filtered = filtered.filter(
        (task) =>
          task.jiraId &&
          task.jiraId.toLowerCase().includes(searchJiraId.toLowerCase())
      )
    }

    if (searchTitle) {
      filtered = filtered.filter(
        (task) =>
          task.title &&
          task.title.toLowerCase().includes(searchTitle.toLowerCase())
      )
    }

    return filtered
  }, [jiraTasks, showAllRecords, searchJiraId, searchTitle])

  const visibleTasks = getVisibleJiraTasks()
  const totalPages = Math.ceil(visibleTasks.length / PAGE_SIZE) || 1
  const pagedTasks = visibleTasks.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const showAllItems = () => {
    setShowAllRecords(true)
    setCurrentPage(1)
  }

  const showOnlyUnhiddenItems = () => {
    setShowAllRecords(false)
    setCurrentPage(1)
  }

  const previousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <div className="jira-container">
      <h2 className="jira-title">JIRA Task Manager</h2>

      {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      {/* LIST PANE */}
      {showListPane && (
        <div className="card">
          <div className="card-header">
            <h4>JIRA Task List</h4>
            <div className="card-header-actions">
              <button className="btn btn-outline-dark" onClick={showAllItems}>
                Show All
              </button>
              <button className="btn btn-outline-success" onClick={showOnlyUnhiddenItems}>
                Show Only Unhidden
              </button>
              <button className="btn btn-secondary" onClick={loadJiraList}>
                Reload List
              </button>
              <button className="btn btn-primary" onClick={addNewJira}>
                Add JIRA Task
              </button>
            </div>
          </div>

          {/* SEARCH */}
          <div className="search-row">
            <input
              type="text"
              className="form-control"
              placeholder="Find by JIRA ID"
              value={searchJiraId}
              onChange={(e) => {
                setSearchJiraId(e.target.value)
                setCurrentPage(1)
              }}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Filter by Title"
              value={searchTitle}
              onChange={(e) => {
                setSearchTitle(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          <div className="current-view">
            <strong>Current View:</strong>{' '}
            {showAllRecords ? 'All Records' : 'Only Unhidden Records'}
          </div>

          {isLoading && (
            <div className="loading-text">
              <strong>Loading... Please wait</strong>
            </div>
          )}

          {/* TABLE */}
          <div className="table-wrapper">
            <table className="jira-table">
              <thead>
                <tr>
                  <th>JIRA ID</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Priority</th>
                  <th style={{ width: '260px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedTasks.map((task) => (
                  <tr key={task.jiraId} className={getRowClass(task.jiraStatus)}>
                    <td>
                      <span
                        className="jira-id-copy"
                        title="Click to copy JIRA link"
                        onClick={() => copyJiraLink(task.jiraLink)}
                      >
                        {task.jiraId}
                      </span>
                    </td>
                    <td>{task.title}</td>
                    <td>
                      <select
                        className="form-control form-control-sm"
                        value={task.jiraStatus}
                        onChange={(e) => {
                          const updated = { ...task, jiraStatus: e.target.value }
                          setJiraTasks((prev) =>
                            prev.map((t) => (t.jiraId === task.jiraId ? updated : t))
                          )
                          updateJiraPriority(updated)
                        }}
                      >
                        {JIRA_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{task.createdDate}</td>
                    <td>
                      <select
                        className="form-control form-control-sm"
                        value={task.priorityOngoing}
                        onChange={(e) => {
                          const updated = { ...task, priorityOngoing: Number(e.target.value) }
                          setJiraTasks((prev) =>
                            prev.map((t) => (t.jiraId === task.jiraId ? updated : t))
                          )
                          updateJiraPriority(updated)
                        }}
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="action-cell">
                      <button className="btn btn-sm btn-warning" onClick={() => editJira(task)}>
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => viewNotes(task)}
                      >
                        Note
                      </button>
                      {!task.showHideFlag ? (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => updateShowHideFlag(task, true)}
                        >
                          Hide
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() => updateShowHideFlag(task, false)}
                        >
                          Unhide
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {visibleTasks.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="text-center">
                      No JIRA tasks found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {visibleTasks.length > 0 && (
            <div className="pagination-row">
              <div>
                Showing page {currentPage} of {totalPages}
              </div>
              <div className="pagination-buttons">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={previousPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-light'}`}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* EDIT / ADD PANE */}
      {showEditPane && (
        <div className="edit-pane">
          <div className="edit-form-col">
            <div className="card">
              <div className="card-header">
                <h4>{screenMode} JIRA Details</h4>
                <button className="btn btn-secondary btn-sm" onClick={backToList}>
                  Back to List
                </button>
              </div>

              <hr />

              <div className="form-group">
                <label>JIRA ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={jiraTask.jiraId}
                  onChange={(e) => setJiraTask({ ...jiraTask, jiraId: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={jiraTask.title}
                  onChange={(e) => setJiraTask({ ...jiraTask, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>JIRA Link</label>
                <input
                  type="text"
                  className="form-control"
                  value={jiraTask.jiraLink}
                  onChange={(e) => setJiraTask({ ...jiraTask, jiraLink: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Folder Location</label>
                <input
                  type="text"
                  className="form-control"
                  value={jiraTask.folderLocation}
                  onChange={(e) => setJiraTask({ ...jiraTask, folderLocation: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>File Location</label>
                <input
                  type="text"
                  className="form-control"
                  value={jiraTask.fileLocation}
                  onChange={(e) => setJiraTask({ ...jiraTask, fileLocation: e.target.value })}
                />
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    className="form-control"
                    value={jiraTask.jiraStatus}
                    onChange={(e) => setJiraTask({ ...jiraTask, jiraStatus: e.target.value })}
                  >
                    {JIRA_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Created</label>
                  <input
                    type="date"
                    className="form-control"
                    value={jiraTask.createdDate}
                    onChange={(e) => setJiraTask({ ...jiraTask, createdDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Completed</label>
                  <input
                    type="date"
                    className="form-control"
                    value={jiraTask.completedDate || ''}
                    onChange={(e) =>
                      setJiraTask({ ...jiraTask, completedDate: e.target.value || null })
                    }
                  />
                </div>
              </div>

              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="showHideFlag"
                  checked={jiraTask.showHideFlag}
                  onChange={(e) => setJiraTask({ ...jiraTask, showHideFlag: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="showHideFlag">
                  Hide this JIRA task
                </label>
              </div>
            </div>
          </div>

          {/* ACTION PANEL */}
          <div className="edit-actions-col">
            <div className="card">
              <h4>Actions</h4>
              <hr />
              <div className="action-grid">
                <button className="btn btn-primary" onClick={createJira}>
                  Create JIRA
                </button>
                <button className="btn btn-success" onClick={saveJira}>
                  Save
                </button>
                <button className="btn btn-warning" onClick={updateJira}>
                  Update
                </button>
                <button className="btn btn-danger" onClick={confirmDeleteJira}>
                  Delete
                </button>
                <button className="btn btn-secondary" onClick={createFolders}>
                  Create Folders
                </button>
                <button className="btn btn-info" onClick={moveContent}>
                  Move Content
                </button>
                <button className="btn btn-dark" onClick={changeStatus}>
                  Change Status
                </button>
                <button className="btn btn-light" onClick={resetForm}>
                  Reset
                </button>
              </div>
              {isLoading && (
                <div className="loading-text">
                  <strong>Loading... Please wait</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* NOTES EDITOR PANE */}
      {showNotesPane && notesTask && (
        <div className="notes-editor-pane">
          <div className="card">
            <div className="card-header">
              <div>
                <h4>Notes — {notesTask.jiraId}</h4>
                <span className="notes-subtitle">{notesTask.title}</span>
              </div>
              <div className="card-header-actions">
                <select
                  className="form-control form-control-sm notes-status-select"
                  value={notesTask.jiraStatus}
                  onChange={(e) => updateNotesStatus(e.target.value)}
                >
                  {JIRA_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button className="btn btn-success" onClick={saveNotes} disabled={isLoading}>
                  Save Notes
                </button>
                <button className="btn btn-secondary btn-sm" onClick={backToList}>
                  Back to List
                </button>
              </div>
            </div>

            {isLoading && (
              <div className="loading-text">
                <strong>Saving...</strong>
              </div>
            )}

            <div className="notes-toolbar">
              <button
                className="btn btn-sm btn-light"
                title="Bold"
                onClick={() => insertFormatting('**', '**')}
              >
                <strong>B</strong>
              </button>
              <button
                className="btn btn-sm btn-light"
                title="Italic"
                onClick={() => insertFormatting('_', '_')}
              >
                <em>I</em>
              </button>
              <button
                className="btn btn-sm btn-light"
                title="Heading"
                onClick={() => insertFormatting('## ', '')}
              >
                H
              </button>
              <button
                className="btn btn-sm btn-light"
                title="Bullet List"
                onClick={() => insertFormatting('- ', '')}
              >
                • List
              </button>
              <button
                className="btn btn-sm btn-light"
                title="Code Block"
                onClick={() => insertFormatting('```\n', '\n```')}
              >
                {'</>'}
              </button>
              <button
                className="btn btn-sm btn-light"
                title="Link"
                onClick={() => insertFormatting('[', '](url)')}
              >
                🔗
              </button>
            </div>

            <textarea
              ref={notesTextareaRef}
              className="notes-textarea"
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              placeholder="Write your notes here... Supports markdown-style formatting."
            />

            <div className="notes-footer">
              <span className="text-muted">
                {notesContent.length} characters • Use toolbar for formatting
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Jira
