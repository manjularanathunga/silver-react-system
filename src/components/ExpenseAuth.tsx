import { useState, useEffect } from 'react'

interface ExpenseAuthProps {
  children: React.ReactNode
}

const AUTH_KEY = 'expense_auth'
const SESSION_DURATION = 30 * 60 * 1000 // 30 minutes

function ExpenseAuth({ children }: ExpenseAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if already authenticated
    const stored = sessionStorage.getItem(AUTH_KEY)
    if (stored) {
      const { timestamp } = JSON.parse(stored)
      if (Date.now() - timestamp < SESSION_DURATION) {
        setIsAuthenticated(true)
      } else {
        sessionStorage.removeItem(AUTH_KEY)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!pin.trim()) { setError('Enter your PIN'); return }

    try {
      const response = await fetch('/api/expenses/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      if (response.ok) {
        sessionStorage.setItem(AUTH_KEY, JSON.stringify({ timestamp: Date.now() }))
        setIsAuthenticated(true)
      } else {
        setError('Invalid PIN')
        setPin('')
      }
    } catch {
      setError('Authentication failed')
    }
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  return (
    <div className="expense-auth-container">
      <div className="expense-auth-card">
        <div className="expense-auth-icon">🔒</div>
        <h2>Expenses Access</h2>
        <p>Enter your PIN to access the expense tracker.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            className="expense-auth-input"
            placeholder="Enter PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            autoFocus
            maxLength={6}
          />
          {error && <div className="expense-auth-error">{error}</div>}
          <button type="submit" className="expense-auth-btn">Unlock</button>
        </form>
      </div>
    </div>
  )
}

export default ExpenseAuth
