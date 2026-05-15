import { useState, useEffect, useCallback } from 'react'
import '../css/Ops.css'

interface FileRecord {
  fileId: string
  url: string
  link: string
  type: string
  serviceUrlVer: string
  lastResponse: string
  lastModified: string
  linkExists: boolean
  status: boolean
}

interface TypeItem {
  fileName: string
}

const PAGE_PATH = '/api/ops'

function Ops() {
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Selects
  const envList = ['L', 'Q', 'R', 'A']
  const verList = ['25', '26', '27']
  const selectItems = [1, 2]

  const [selectedEnv, setSelectedEnv] = useState('')
  const [selectedVer, setSelectedVer] = useState('')
  const [typeList, setTypeList] = useState<TypeItem[]>([])
  const [selectedType, setSelectedType] = useState('')
  const [selectedActionId, setSelectedActionId] = useState('')

  const [newFileGivenName, setNewFileGivenName] = useState('')

  // Files list
  const [files, setFiles] = useState<FileRecord[]>([])

  // Add file form
  const [newFile, setNewFile] = useState({ name: '', email: '' })

  // Edit mode
  const [editMode, setEditMode] = useState(false)
  const [editFileData, setEditFileData] = useState<FileRecord>({
    fileId: '',
    url: '',
    link: '',
    type: '',
    serviceUrlVer: '',
    lastResponse: '',
    lastModified: '',
    linkExists: false,
    status: false,
  })

  const clear = () => {
    setSuccessMessage('')
    setErrorMessage('')
  }

  const loadTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/soupreq/loadTypes')
      const data: TypeItem[] = await response.json()
      setTypeList(data)
    } catch (error) {
      console.error('Failed to load types', error)
    }
  }, [])

  useEffect(() => {
    loadTypes()
  }, [loadTypes])

  // Build path when selects change
  useEffect(() => {
    if (selectedEnv && selectedVer && selectedType) {
      setNewFileGivenName(`${selectedEnv}/${selectedVer}/${selectedType}/`)
    }
  }, [selectedEnv, selectedVer, selectedType])

  const loadFileToDb = async () => {
    clear()
    try {
      await fetch(`${PAGE_PATH}/loadFileToDb`)
      await loadDBData()
      setSuccessMessage('Database created')
    } catch (error) {
      setErrorMessage('Failed to re-create database')
    }
  }

  const updateDatabaseRecord = async () => {
    clear()
    try {
      await fetch(`${PAGE_PATH}/updateDatabaseRecord`)
      await loadDBData()
      setSuccessMessage('Database Updated')
    } catch (error) {
      setErrorMessage('Failed to update database')
    }
  }

  const loadDBData = async () => {
    clear()
    try {
      const response = await fetch(`${PAGE_PATH}/findAll`)
      const data: FileRecord[] = await response.json()
      setFiles(data)
    } catch (error) {
      console.error('Failed to load DB data', error)
    }
  }

  const clearPath = () => {
    clear()
    setNewFileGivenName('')
  }

  const createFileGivenName = async () => {
    clear()
    if (!newFileGivenName) {
      console.error('newFileGivenName is empty')
      return
    }
    try {
      const response = await fetch(
        `${PAGE_PATH}/createFileGivenName?fname=${encodeURIComponent(newFileGivenName)}`
      )
      if (!response.ok) throw new Error(response.statusText)
      setSuccessMessage('New File created')
    } catch (error) {
      setErrorMessage(
        'Something went wrong: ' + (error instanceof Error ? error.message : 'Unknown Error')
      )
    }
  }

  const processBookItinerary = async () => {
    clear()
    if (!selectedActionId) return
    try {
      await fetch(
        `${PAGE_PATH}/processBookItinerary?selectedActionid=${encodeURIComponent(selectedActionId)}`
      )
    } catch (error) {
      setErrorMessage(
        'Something went wrong: ' + (error instanceof Error ? error.message : 'Unknown Error')
      )
    }
  }

  // Add file
  const addFile = (e: React.FormEvent) => {
    e.preventDefault()
    clear()
    if (newFile.name && newFile.email) {
      setFiles((prev) => [...prev, { fileId: newFile.name, url: newFile.email, link: '', type: '', serviceUrlVer: '', lastResponse: '', lastModified: '', linkExists: false, status: false }])
      setNewFile({ name: '', email: '' })
    }
  }

  // Edit file
  const startEditFile = (file: FileRecord) => {
    clear()
    setEditMode(true)
    setEditFileData({ ...file })
  }

  // Update file
  const updateFile = (e: React.FormEvent) => {
    e.preventDefault()
    clear()
    setFiles((prev) =>
      prev.map((f) => (f.fileId === editFileData.fileId ? { ...editFileData } : f))
    )
    setEditMode(false)
  }

  // Delete file
  const deleteFile = (file: FileRecord) => {
    clear()
    setFiles((prev) => prev.filter((f) => f !== file))
  }

  // Cancel edit
  const cancelEdit = () => {
    clear()
    setEditMode(false)
    setEditFileData({
      fileId: '',
      url: '',
      link: '',
      type: '',
      serviceUrlVer: '',
      lastResponse: '',
      lastModified: '',
      linkExists: false,
      status: false,
    })
  }

  return (
    <div className="ops-container">
      <p className="ops-heading">SOUP</p>

      {successMessage && <p className="msg-success">{successMessage}</p>}
      {errorMessage && <p className="msg-error">{errorMessage}</p>}

      <div className="ops-actions-row">
        <button className="btn btn-primary" onClick={updateDatabaseRecord}>
          Update-Database
        </button>
        <span className="separator">|</span>
        <button className="btn btn-primary" onClick={loadFileToDb}>
          Re-Create-Database
        </button>
      </div>

      <hr />

      {/* Selects row */}
      <div className="ops-selects-row">
        <select
          className="form-select"
          value={selectedEnv}
          onChange={(e) => setSelectedEnv(e.target.value)}
        >
          <option value="">-- Env --</option>
          {envList.map((env) => (
            <option key={env} value={env}>
              {env}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          value={selectedVer}
          onChange={(e) => setSelectedVer(e.target.value)}
        >
          <option value="">-- Ver --</option>
          {verList.map((ver) => (
            <option key={ver} value={ver}>
              {ver}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="">-- Type --</option>
          {typeList.map((t) => (
            <option key={t.fileName} value={t.fileName}>
              {t.fileName}
            </option>
          ))}
        </select>
      </div>

      <div className="ops-path-row">
        <input
          type="text"
          className="form-control path-input"
          value={newFileGivenName}
          onChange={(e) => setNewFileGivenName(e.target.value)}
        />
        <span className="separator">|</span>
        <button className="btn btn-primary" onClick={clearPath}>
          Clear-Path
        </button>
        <span className="separator">|</span>
        <button className="btn btn-primary" onClick={createFileGivenName}>
          CreatXMLFile
        </button>
      </div>

      <hr />

      {/* Process action */}
      <div className="ops-action-select-row">
        <select
          className="form-select"
          value={selectedActionId}
          onChange={(e) => setSelectedActionId(e.target.value)}
        >
          <option value="">-- Action --</option>
          {selectItems.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={processBookItinerary}>
          processBookItinerary
        </button>
      </div>

      <hr />

      <button className="btn btn-primary" onClick={loadDBData}>
        loadDBData
      </button>

      <hr />

      {/* Add file form */}
      <form className="add-file-form" onSubmit={addFile}>
        <input
          type="text"
          placeholder="Name"
          required
          value={newFile.name}
          onChange={(e) => setNewFile({ ...newFile, name: e.target.value })}
        />
        <input
          type="email"
          placeholder="Email"
          required
          value={newFile.email}
          onChange={(e) => setNewFile({ ...newFile, email: e.target.value })}
        />
        <button type="submit" className="btn btn-primary">
          Add file
        </button>
      </form>

      <h3>files List:</h3>
      <ul className="files-list">
        {files.map((file, index) => (
          <li key={file.fileId + index}>
            <span>
              {file.fileId} ({file.url})
            </span>
            <button className="btn btn-primary btn-sm" onClick={() => startEditFile(file)}>
              Edit
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => deleteFile(file)}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      {/* Edit file modal */}
      {editMode && (
        <div className="edit-file-form">
          <h4>Edit file</h4>
          <form onSubmit={updateFile}>
            <div className="edit-field">
              <label>fileId:</label>
              <input
                type="text"
                required
                value={editFileData.fileId}
                onChange={(e) => setEditFileData({ ...editFileData, fileId: e.target.value })}
              />
            </div>
            <div className="edit-field">
              <label>url:</label>
              <input
                type="text"
                required
                value={editFileData.url}
                onChange={(e) => setEditFileData({ ...editFileData, url: e.target.value })}
              />
            </div>
            <div className="edit-field">
              <label>link:</label>
              <input
                type="text"
                required
                value={editFileData.link}
                onChange={(e) => setEditFileData({ ...editFileData, link: e.target.value })}
              />
            </div>
            <div className="edit-field">
              <label>type:</label>
              <input
                type="text"
                required
                value={editFileData.type}
                onChange={(e) => setEditFileData({ ...editFileData, type: e.target.value })}
              />
            </div>
            <div className="edit-field">
              <label>serviceUrlVer:</label>
              <input
                type="text"
                value={editFileData.serviceUrlVer}
                onChange={(e) => setEditFileData({ ...editFileData, serviceUrlVer: e.target.value })}
              />
            </div>
            <div className="edit-field">
              <label>lastResponse:</label>
              <input
                type="text"
                value={editFileData.lastResponse}
                onChange={(e) => setEditFileData({ ...editFileData, lastResponse: e.target.value })}
              />
            </div>
            <div className="edit-field">
              <label>lastModified:</label>
              <input
                type="text"
                value={editFileData.lastModified}
                onChange={(e) => setEditFileData({ ...editFileData, lastModified: e.target.value })}
              />
            </div>
            <div className="edit-field checkbox-field">
              <label>linkExists:</label>
              <input
                type="checkbox"
                checked={editFileData.linkExists}
                onChange={(e) => setEditFileData({ ...editFileData, linkExists: e.target.checked })}
              />
            </div>
            <div className="edit-field checkbox-field">
              <label>status:</label>
              <input
                type="checkbox"
                checked={editFileData.status}
                onChange={(e) => setEditFileData({ ...editFileData, status: e.target.checked })}
              />
            </div>
            <div className="edit-actions">
              <button type="submit" className="btn btn-primary">
                Update
              </button>
              <button type="button" className="btn btn-primary" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default Ops
