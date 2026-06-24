import { useState, useEffect, useCallback } from 'react'
import '../css/SoupReq.css'

interface UrlItem {
  id: number
  url: string
}

interface HostItem {
  id: number
  url: string
}

interface TypeItem {
  fileName: string
  description: string
}

interface ReqFileItem {
  id: number
  url: string
  link: string
  linkExists: boolean
  favorite: boolean
}

const PAGE_PATH = '/api/soupreq'
const MQ_PATH = '/api/mq'

function getFileName(path: string): string {
  if (!path) return ''
  return path.split(/[/\\]/).pop() || ''
}

type ViewMode = 'favorites' | 'all' | 'ibmMq'

function SoupReq() {
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [viewMode, setViewMode] = useState<ViewMode>('favorites')

  const [urlList, setUrlList] = useState<UrlItem[]>([])
  const [hostList, setHostList] = useState<HostItem[]>([])
  const [typeList, setTypeList] = useState<TypeItem[]>([])

  const [selectedUrl, setSelectedUrl] = useState('')
  const [selectedHost, setSelectedHost] = useState('')
  const [selectedType, setSelectedType] = useState('')

  const [reqFileList, setReqFileList] = useState<ReqFileItem[]>([])
  const [urlShowList, setUrlShowList] = useState<ReqFileItem[]>([])

  const [filterRecord, setFilterRecord] = useState('')

  const [showContent, setShowContent] = useState(false)
  const [xmlContent, setXmlContent] = useState('')
  const [xmlFilePath, setXmlFilePath] = useState('')

  // IBM MQ fields
  const [mqFileName, setMqFileName] = useState('')
  const [mqMessageName, setMqMessageName] = useState('HermesIncoming')
  const [mqMessageId, setMqMessageId] = useState('')

  const sortByIdAscending = (arr: ReqFileItem[]) => {
    return [...arr].sort((a, b) => a.id - b.id)
  }

  const refreshGUI = useCallback((data: ReqFileItem[]) => {
    setUrlShowList(sortByIdAscending(data))
  }, [])

  const loadFavorites = useCallback(async () => {
    try {
      const response = await fetch(`${PAGE_PATH}/loadFavoriteRequest`)
      const data: ReqFileItem[] = await response.json()
      setReqFileList(data)
      refreshGUI(data)
    } catch (error) {
      setErrorMessage('Something went wrong loading favorite requests')
    }
  }, [refreshGUI])

  const loadAllRequests = useCallback(async () => {
    try {
      const response = await fetch(`${PAGE_PATH}/loadRequest`)
      const data: ReqFileItem[] = await response.json()
      setReqFileList(data)
      refreshGUI(data)
    } catch (error) {
      setErrorMessage('Something went wrong loading requests')
    }
  }, [refreshGUI])

  const requestUrlList = useCallback(async () => {
    try {
      const response = await fetch(`${PAGE_PATH}/requestURlList`)
      const data: UrlItem[] = await response.json()
      setUrlList(data)
    } catch (error) {
      console.error('Failed to load URL list', error)
    }
  }, [])

  const loadTypes = useCallback(async () => {
    try {
      const response = await fetch(`${PAGE_PATH}/loadTypes`)
      const data: TypeItem[] = await response.json()
      setTypeList(data)
    } catch (error) {
      console.error('Failed to load types', error)
    }
  }, [])

  const getHostList = useCallback(async () => {
    try {
      const response = await fetch(`${PAGE_PATH}/getHostList`)
      const data: HostItem[] = await response.json()
      setHostList(data)
    } catch (error) {
      console.error('Failed to load host list', error)
    }
  }, [])

  // Initial load: favorites
  useEffect(() => {
    loadFavorites()
    requestUrlList()
    loadTypes()
    getHostList()
  }, [loadFavorites, requestUrlList, loadTypes, getHostList])

  const switchView = (mode: ViewMode) => {
    setViewMode(mode)
    setShowContent(false)
    resetMessages()
    if (mode === 'favorites') {
      loadFavorites()
    } else if (mode === 'all') {
      loadAllRequests()
    }
  }

  const resetMessages = () => {
    setSuccessMessage('')
    setErrorMessage('')
  }

  const reloadFiles = async () => {
    try {
      const endpoint = viewMode === 'favorites' ? '/loadFavoriteRequest' : '/reloadFiles'
      const response = await fetch(`${PAGE_PATH}${endpoint}`)
      const data: ReqFileItem[] = await response.json()
      setReqFileList(data)
      refreshGUI(data)
    } catch (error) {
      console.error('Failed to reload files', error)
    }
  }

  const performSoupRequest = async (fileName: number) => {
    if (!fileName || !selectedUrl || !selectedHost) return

    setSuccessMessage('Processing Started ..... !')
    setErrorMessage('')
    setIsLoading(true)

    try {
      const response = await fetch(
        `${PAGE_PATH}/sendRequest?reqid=${fileName}&fileid=${selectedUrl}&hostid=${selectedHost}`
      )
      if (response.ok) {
        setSuccessMessage('Request Success : ' + fileName)
        setErrorMessage('')
        reloadFiles()
      } else {
        const errData = await response.json().catch(() => null)
        setSuccessMessage('')
        setErrorMessage(
          'Error: ' + fileName + (errData?.message ? ' | ' + errData.message : '')
        )
      }
    } catch (error) {
      setSuccessMessage('')
      setErrorMessage('Error: ' + fileName + ' | Request failed')
    } finally {
      setIsLoading(false)
    }
  }

  const clearFilters = () => {
    setSelectedHost('')
    setSelectedUrl('')
    setSelectedType('')
    setFilterRecord('')
    setUrlShowList(reqFileList)
    setShowContent(false)
  }

  const onSelectChangeHost = (type: string) => {
    let filtered = [...reqFileList]

    if (type) {
      filtered = filtered.filter((u) => getFileName(u.url).includes(type))
    }

    setUrlShowList(sortByIdAscending(filtered))
  }

  const handleUrlChange = (value: string) => {
    setSelectedUrl(value)
    onSelectChangeHost('')
  }

  const handleHostChange = (value: string) => {
    setSelectedHost(value)
    onSelectChangeHost('')
  }

  const handleTypeChange = (value: string) => {
    setSelectedType(value)
    const selectedItem = typeList.find((item) => item.fileName === value)
    onSelectChangeHost(selectedItem?.description || '')
  }

  const openExtFile = (filename: string) => {
    navigator.clipboard.writeText('start msedge ' + filename)
    alert('Filename Copied !!!! ' + filename)
  }

  const openXmlFile = async (filepath: string) => {
    if (!filepath) {
      setShowContent(!showContent)
      return
    }

    try {
      const encodedPath = encodeURIComponent(filepath)
      const response = await fetch(`${PAGE_PATH}/showContent?filepath=${encodedPath}`, {
        headers: { Accept: 'application/xml' },
      })
      const data = await response.text()
      setXmlContent(data)
    } catch (error) {
      console.error('Failed to load XML content', error)
    }

    setXmlFilePath(filepath)
    setShowContent(!showContent)
  }

  const makeFavorite = async (record: ReqFileItem) => {
    try {
      const response = await fetch(`${PAGE_PATH}/makeFavorite?recordId=${record.id}`)
      if (response.ok) {
        reloadFiles()
      }
    } catch (error) {
      console.error('Failed to toggle favorite', error)
    }
  }

  // IBM MQ
  const generateMessageId = () => {
    setMqMessageId('MSG-' + Date.now())
  }

  const sendMqMessage = async () => {
    if (!mqFileName) {
      setErrorMessage('File name is required')
      return
    }

    setSuccessMessage('Processing Started...')
    setErrorMessage('')
    setIsLoading(true)

    try {
      const response = await fetch(`${MQ_PATH}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: mqFileName,
          messageName: mqMessageName,
          messageId: mqMessageId,
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || response.statusText)
      }

      const data = await response.text()
      setSuccessMessage(data)
      setErrorMessage('')
    } catch (error) {
      setSuccessMessage('')
      setErrorMessage(
        'MQ Send Failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Filter displayed list
  const displayedList = urlShowList.filter((item) => {
    if (!filterRecord) return true
    const lower = filterRecord.toLowerCase()
    const name = getFileName(item.url).toLowerCase()
    return name.includes(lower) || String(item.id).includes(lower)
  })

  return (
    <div className="soup-container">
      {/* View Mode Tabs */}
      <div className="soup-view-tabs">
        <button
          className={`btn ${viewMode === 'favorites' ? 'btn-primary' : 'btn-outline-dark'}`}
          onClick={() => switchView('favorites')}
        >
          ★ Favorites
        </button>
        <button
          className={`btn ${viewMode === 'all' ? 'btn-primary' : 'btn-outline-dark'}`}
          onClick={() => switchView('all')}
        >
          All Requests
        </button>
        <button
          className={`btn ${viewMode === 'ibmMq' ? 'btn-primary' : 'btn-outline-dark'}`}
          onClick={() => switchView('ibmMq')}
        >
          IBM MQ
        </button>
      </div>

      {errorMessage && <div className="msg-error">{errorMessage}</div>}
      {successMessage && <div className="msg-success">{successMessage}</div>}

      {/* SOUP REQUEST VIEW (Favorites / All) */}
      {(viewMode === 'favorites' || viewMode === 'all') && (
        <>
          <h3>{viewMode === 'favorites' ? 'Favorite Requests' : 'All Request Files'}</h3>

          <div className="soup-toolbar">
            <div className="soup-search">
              <label htmlFor="filterRecord">Search:</label>
              <input
                id="filterRecord"
                type="text"
                className="form-text"
                value={filterRecord}
                onChange={(e) => setFilterRecord(e.target.value)}
              />
            </div>
            <div className="soup-toolbar-actions">
              <button className="btn btn-secondary" onClick={clearFilters}>
                Clear Filters
              </button>
              <button className="btn btn-secondary" onClick={() => viewMode === 'favorites' ? loadFavorites() : loadAllRequests()}>
                Update Request
              </button>
              <button className="btn btn-secondary" onClick={reloadFiles}>
                Reload Files
              </button>
            </div>
          </div>

          <hr className="divider-green" />

          {/* Selects row */}
          <div className="soup-selects-row">
            <div className="soup-select-group">
              <label htmlFor="idUrl">URL:</label>
              <select
                id="idUrl"
                className="form-select"
                value={selectedUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
              >
                <option value="">-- Select URL --</option>
                {urlList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.url}
                  </option>
                ))}
              </select>
            </div>

            <div className="soup-select-group">
              <label htmlFor="idHost">HOST:</label>
              <select
                id="idHost"
                className="form-select"
                value={selectedHost}
                onChange={(e) => handleHostChange(e.target.value)}
              >
                <option value="">-- Select Host --</option>
                {hostList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.url}
                  </option>
                ))}
              </select>
            </div>

            <div className="soup-select-group">
              <label htmlFor="idType">TYPE:</label>
              <select
                id="idType"
                className="form-select"
                value={selectedType}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="">-- Select Type --</option>
                {typeList.map((item) => (
                  <option key={item.fileName} value={item.fileName}>
                    {item.fileName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <hr className="divider-green" />

          {isLoading && <div className="loading-overlay">Loading... Please wait</div>}

          {!showContent ? (
            <div className="table-wrapper">
              <table className="soup-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedList.map((x) => (
                    <tr key={x.id}>
                      <td>{x.id}</td>
                      <td>{getFileName(x.url)}</td>
                      <td className="soup-actions-cell">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => performSoupRequest(x.id)}
                        >
                          Send
                        </button>
                        {x.linkExists && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openExtFile(x.link)}
                          >
                            Copy Response
                          </button>
                        )}
                        {x.linkExists && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => openXmlFile(x.link)}
                          >
                            View
                          </button>
                        )}
                        <button className="btn btn-light btn-sm" onClick={() => openXmlFile(x.url)}>
                          Request
                        </button>
                        <button
                          className={`btn btn-sm ${x.favorite ? 'btn-warning' : 'btn-info'}`}
                          onClick={() => makeFavorite(x)}
                        >
                          {x.favorite ? '★' : '☆'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {displayedList.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center">
                        {viewMode === 'favorites' ? 'No favorite records found' : 'No records found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="xml-content-view">
              <button className="btn btn-success" onClick={() => openXmlFile('')}>
                Show Filter
              </button>
              <hr className="divider-green" />
              <h5>{xmlFilePath}</h5>
              <hr className="divider-green" />
              <pre className="xml-pre">{xmlContent}</pre>
              <hr className="divider-green" />
            </div>
          )}
        </>
      )}

      {/* IBM MQ VIEW */}
      {viewMode === 'ibmMq' && (
        <div className="ibm-mq-section">
          <h3>Send IBM MQ Message</h3>

          <br />

          <div className="form-group">
            <label>File Path:</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter file path"
              value={mqFileName}
              onChange={(e) => setMqFileName(e.target.value)}
            />
          </div>

          <br />

          <div className="form-group">
            <label>Message Name:</label>
            <input
              type="text"
              className="form-control"
              value={mqMessageName}
              onChange={(e) => setMqMessageName(e.target.value)}
            />
          </div>

          <br />

          <div className="form-group">
            <label>Message ID:</label>
            <div className="input-with-btn">
              <input
                type="text"
                className="form-control"
                value={mqMessageId}
                onChange={(e) => setMqMessageId(e.target.value)}
              />
              <button className="btn btn-secondary" onClick={generateMessageId}>
                Auto
              </button>
            </div>
          </div>

          <br />

          <button className="btn btn-primary" onClick={sendMqMessage}>
            Send MQ Message
          </button>

          {isLoading && <div className="loading-text">Loading... Please wait</div>}
        </div>
      )}
    </div>
  )
}

export default SoupReq
