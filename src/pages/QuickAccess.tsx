import { useState, useEffect, useCallback } from 'react'
import '../css/QuickAccess.css'

interface PasswordItem {
  id: number | null
  systemName: string
  password: string
  passwordHint: string
  updatedDate?: string
}

interface HistoryItem {
  changedDate: string
  passwordHint: string
}

const BASE_URL = '/api/password'

const STATIC_INFO = {
  email: 'sirimewan.ranathunga@silverrailtech.com',
  louname: 'linkon',
  mobile: '0737457423',
  userId: 'sra125',
}

function newPasswordItem(): PasswordItem {
  return {
    id: null,
    systemName: '',
    password: '',
    passwordHint: '',
  }
}

function QuickAccess() {
  const [activeTab, setActiveTab] = useState('static')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [passwordList, setPasswordList] = useState<PasswordItem[]>([])
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])
  const [passwordItem, setPasswordItem] = useState<PasswordItem>(newPasswordItem())

  const clearMessage = () => {
    setSuccessMessage('')
    setErrorMessage('')
  }

  const handleSetTab = (tabName: string) => {
    setActiveTab(tabName)
    clearMessage()
  }

  const copyText = async (text: string) => {
    if (!text) {
      setErrorMessage('Nothing to copy')
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setSuccessMessage('Copied successfully')
      setErrorMessage('')
    } catch {
      setErrorMessage('Copy failed')
      setSuccessMessage('')
    }
  }

  const loadPasswords = useCallback(async () => {
    clearMessage()
    try {
      const response = await fetch(`${BASE_URL}/list`)
      const data = await response.json()
      if (data && data.data) {
        setPasswordList(data.data)
      } else {
        setPasswordList([])
      }
    } catch {
      setErrorMessage('Failed to load passwords')
    }
  }, [])

  useEffect(() => {
    loadPasswords()
  }, [loadPasswords])

  const savePassword = async () => {
    clearMessage()

    if (!passwordItem.systemName) {
      setErrorMessage('System name is required')
      return
    }

    if (!passwordItem.password) {
      setErrorMessage('Password is required')
      return
    }

    try {
      const response = await fetch(`${BASE_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordItem),
      })
      const data = await response.json()
      if (!response.ok) throw new Error()
      setSuccessMessage(data && data.message ? data.message : 'Password saved successfully')
      resetForm()
      loadPasswords()
      setActiveTab('list')
    } catch {
      setErrorMessage('Failed to save password')
    }
  }

  const editPassword = (item: PasswordItem) => {
    setPasswordItem({
      id: item.id,
      systemName: item.systemName,
      password: '',
      passwordHint: item.passwordHint,
    })
    setActiveTab('password')
    clearMessage()
  }

  const loadHistory = async (id: number | null) => {
    if (id === null) return
    clearMessage()
    try {
      const response = await fetch(`${BASE_URL}/history/${id}`)
      const data = await response.json()
      if (data && data.data) {
        setHistoryList(data.data)
      } else {
        setHistoryList([])
      }
      setActiveTab('history')
    } catch {
      setErrorMessage('Failed to load history')
    }
  }

  const resetForm = () => {
    setPasswordItem(newPasswordItem())
  }

  return (
    <div className="quick-access-page">
      <div className="page-header-box">
        <h1>Password Vault</h1>
        <p>Securely manage passwords, hints, and quick access information.</p>
      </div>

      {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      {/* TABS */}
      <div className="modern-tabs">
        <button
          className={`tab-btn ${activeTab === 'static' ? 'active-tab' : ''}`}
          onClick={() => handleSetTab('static')}
        >
          Static Info
        </button>
        <button
          className={`tab-btn ${activeTab === 'password' ? 'active-tab' : ''}`}
          onClick={() => handleSetTab('password')}
        >
          Add Password
        </button>
        <button
          className={`tab-btn ${activeTab === 'list' ? 'active-tab' : ''}`}
          onClick={() => handleSetTab('list')}
        >
          Saved Passwords
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active-tab' : ''}`}
          onClick={() => handleSetTab('history')}
        >
          History
        </button>
      </div>

      {/* STATIC INFO */}
      {activeTab === 'static' && (
        <div className="modern-card">
          <h3>Quick Access Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Email</label>
              <div className="info-value">{STATIC_INFO.email}</div>
              <button className="modern-btn" onClick={() => copyText(STATIC_INFO.email)}>
                Copy
              </button>
            </div>
            <div className="info-item">
              <label>LOU Name</label>
              <div className="info-value">{STATIC_INFO.louname}</div>
              <button className="modern-btn" onClick={() => copyText(STATIC_INFO.louname)}>
                Copy
              </button>
            </div>
            <div className="info-item">
              <label>Mobile</label>
              <div className="info-value">{STATIC_INFO.mobile}</div>
              <button className="modern-btn" onClick={() => copyText(STATIC_INFO.mobile)}>
                Copy
              </button>
            </div>
            <div className="info-item">
              <label>User ID</label>
              <div className="info-value">{STATIC_INFO.userId}</div>
              <button className="modern-btn" onClick={() => copyText(STATIC_INFO.userId)}>
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD FORM */}
      {activeTab === 'password' && (
        <div className="modern-card">
          <h3>Add / Update Password</h3>

          <div className="modern-form-group">
            <label>System Name</label>
            <input
              type="text"
              className="modern-input"
              value={passwordItem.systemName}
              onChange={(e) => setPasswordItem({ ...passwordItem, systemName: e.target.value })}
            />
          </div>

          <div className="modern-form-group">
            <label>Password</label>
            <input
              type="password"
              className="modern-input"
              value={passwordItem.password}
              onChange={(e) => setPasswordItem({ ...passwordItem, password: e.target.value })}
            />
          </div>

          <div className="modern-form-group">
            <label>Password Hint</label>
            <input
              type="text"
              className="modern-input"
              value={passwordItem.passwordHint}
              onChange={(e) => setPasswordItem({ ...passwordItem, passwordHint: e.target.value })}
            />
          </div>

          <div className="action-row">
            <button className="modern-btn primary-btn" onClick={savePassword}>
              Save Password
            </button>
            <button className="modern-btn secondary-btn" onClick={resetForm}>
              Reset
            </button>
          </div>
        </div>
      )}

      {/* PASSWORD LIST */}
      {activeTab === 'list' && (
        <div className="modern-card">
          <div className="header-row">
            <h3>Saved Passwords</h3>
            <button className="modern-btn secondary-btn" onClick={loadPasswords}>
              Reload
            </button>
          </div>

          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>System</th>
                  <th>Hint</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {passwordList.map((item) => (
                  <tr key={item.id}>
                    <td>{item.systemName}</td>
                    <td>{item.passwordHint}</td>
                    <td>{item.updatedDate}</td>
                    <td className="table-actions">
                      <button className="modern-btn warning-btn" onClick={() => editPassword(item)}>
                        Edit
                      </button>
                      <button className="modern-btn info-btn" onClick={() => loadHistory(item.id)}>
                        History
                      </button>
                    </td>
                  </tr>
                ))}
                {passwordList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty-text">
                      No passwords saved
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {activeTab === 'history' && (
        <div className="modern-card">
          <h3>Password History</h3>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Changed Date</th>
                <th>Password Hint</th>
              </tr>
            </thead>
            <tbody>
              {historyList.map((h, index) => (
                <tr key={index}>
                  <td>{h.changedDate}</td>
                  <td>{h.passwordHint}</td>
                </tr>
              ))}
              {historyList.length === 0 && (
                <tr>
                  <td colSpan={2} className="empty-text">
                    No history available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default QuickAccess
