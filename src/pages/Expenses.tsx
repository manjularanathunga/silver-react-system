import { useState, useEffect, useCallback } from 'react'
import '../css/Expenses.css'

interface ExpenseCategory {
  id: number | null
  name: string
  type: 'expense' | 'loan'
}

interface ExpenseEntry {
  id: number | null
  categoryId: number
  categoryName: string
  description: string
  amount: number
  date: string
  type: 'expense' | 'loan'
}

interface SalaryRecord {
  id: number | null
  month: string
  salary: number
}

const API_BASE = '/api/expenses'

function getEmptyCategory(): ExpenseCategory {
  return { id: null, name: '', type: 'expense' }
}

function getEmptyEntry(): ExpenseEntry {
  return { id: null, categoryId: 0, categoryName: '', description: '', amount: 0, date: '', type: 'expense' }
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function Expenses() {
  // Salary
  const [salaryRecord, setSalaryRecord] = useState<SalaryRecord>({ id: null, month: getCurrentMonth(), salary: 0 })
  const [salaryInput, setSalaryInput] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())

  // Categories
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [formCategory, setFormCategory] = useState<ExpenseCategory>(getEmptyCategory())
  const [isEditingCategory, setIsEditingCategory] = useState(false)

  // Entries
  const [entries, setEntries] = useState<ExpenseEntry[]>([])
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [formEntry, setFormEntry] = useState<ExpenseEntry>(getEmptyEntry())
  const [isEditingEntry, setIsEditingEntry] = useState(false)

  // CSV Upload
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; count?: number } | null>(null)
  const [csvPreview, setCsvPreview] = useState<{ date: string; amount: number; title: string; balance: number }[]>([])
  const [showPreview, setShowPreview] = useState(false)

  // Delete by date
  const [deleteFromDate, setDeleteFromDate] = useState('')
  const [deleteToDate, setDeleteToDate] = useState('')

  // Filter
  const [filterCategory, setFilterCategory] = useState('')

  // UI
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'loans' | 'categories' | 'upload'>('overview')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const clearMessages = () => { setSuccessMessage(''); setErrorMessage('') }
  const showSuccess = (msg: string) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(''), 3000) }
  const showError = (msg: string) => { setErrorMessage(msg); setTimeout(() => setErrorMessage(''), 4000) }

  // Load data
  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/categories/list`)
      if (!response.ok) throw new Error('API error')
      const data = await response.json()
      setCategories(data.data || data || [])
    } catch {
      setCategories([])
    }
  }, [])

  const loadEntries = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/entries/list?month=${selectedMonth}`)
      if (!response.ok) throw new Error('API error')
      const data = await response.json()
      setEntries(data.data || data || [])
    } catch {
      setEntries([])
    }
  }, [selectedMonth])

  const loadSalary = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/salary/get?month=${selectedMonth}`)
      if (!response.ok) throw new Error('API error')
      const data = await response.json()
      const record = data.data || data
      if (record && record.salary) {
        setSalaryRecord(record)
        setSalaryInput(String(record.salary))
      } else {
        setSalaryRecord({ id: null, month: selectedMonth, salary: 0 })
        setSalaryInput('')
      }
    } catch {
      setSalaryRecord({ id: null, month: selectedMonth, salary: 0 })
      setSalaryInput('')
    }
  }, [selectedMonth])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { loadEntries() }, [loadEntries])
  useEffect(() => { loadSalary() }, [loadSalary])

  // Salary save
  const saveSalary = async () => {
    clearMessages()
    const amount = parseFloat(salaryInput)
    if (!amount || amount <= 0) { showError('Enter a valid salary amount'); return }
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/salary/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...salaryRecord, month: selectedMonth, salary: amount }),
      })
      if (!response.ok) throw new Error('Save failed')
      showSuccess('Salary saved')
      loadSalary()
    } catch {
      showError('Failed to save salary')
    } finally {
      setIsLoading(false)
    }
  }

  // Category CRUD
  const openAddCategory = () => {
    setFormCategory(getEmptyCategory())
    setIsEditingCategory(false)
    setShowCategoryForm(true)
    clearMessages()
  }

  const openEditCategory = (cat: ExpenseCategory) => {
    setFormCategory({ ...cat })
    setIsEditingCategory(true)
    setShowCategoryForm(true)
    clearMessages()
  }

  const saveCategory = async () => {
    clearMessages()
    if (!formCategory.name.trim()) { showError('Category name is required'); return }
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/categories/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCategory),
      })
      if (!response.ok) throw new Error('Save failed')
      showSuccess(isEditingCategory ? 'Category updated' : 'Category added')
      setShowCategoryForm(false)
      setFormCategory(getEmptyCategory())
      loadCategories()
    } catch {
      showError('Failed to save category')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteCategory = async (cat: ExpenseCategory) => {
    if (!cat.id) return
    if (!confirm(`Delete category "${cat.name}"?`)) return
    try {
      const response = await fetch(`${API_BASE}/categories/delete/${cat.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
      showSuccess('Category deleted')
      loadCategories()
    } catch {
      showError('Failed to delete category')
    }
  }

  // Entry CRUD
  const openAddEntry = (type: 'expense' | 'loan') => {
    setFormEntry({ ...getEmptyEntry(), type, date: new Date().toISOString().split('T')[0] })
    setIsEditingEntry(false)
    setShowEntryForm(true)
    clearMessages()
  }

  const openEditEntry = (entry: ExpenseEntry) => {
    setFormEntry({ ...entry })
    setIsEditingEntry(true)
    setShowEntryForm(true)
    clearMessages()
  }

  const saveEntry = async () => {
    clearMessages()
    if (!formEntry.categoryId) { showError('Select a category'); return }
    if (!formEntry.amount || formEntry.amount <= 0) { showError('Enter a valid amount'); return }
    if (!formEntry.date) { showError('Date is required'); return }

    const category = categories.find(c => c.id === formEntry.categoryId)
    const entryToSave = { ...formEntry, categoryName: category?.name || '', month: selectedMonth }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/entries/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryToSave),
      })
      if (!response.ok) throw new Error('Save failed')
      showSuccess(isEditingEntry ? 'Entry updated' : 'Entry added')
      setShowEntryForm(false)
      setFormEntry(getEmptyEntry())
      loadEntries()
    } catch {
      showError('Failed to save entry')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteEntry = async (entry: ExpenseEntry) => {
    if (!entry.id) return
    if (!confirm('Delete this entry?')) return
    try {
      const response = await fetch(`${API_BASE}/entries/delete/${entry.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
      showSuccess('Entry deleted')
      loadEntries()
    } catch {
      showError('Failed to delete entry')
    }
  }

  // Delete entries by date range
  const deleteByDateRange = async () => {
    clearMessages()
    if (!deleteFromDate || !deleteToDate) { showError('Select both From and To dates'); return }
    if (deleteFromDate > deleteToDate) { showError('From date must be before To date'); return }

    const matchingEntries = entries.filter(e => e.date >= deleteFromDate && e.date <= deleteToDate)
    if (matchingEntries.length === 0) { showError('No entries found in that date range'); return }

    if (!confirm(`Delete ${matchingEntries.length} entries from ${deleteFromDate} to ${deleteToDate}?`)) return

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/entries/delete-by-date`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromDate: deleteFromDate, toDate: deleteToDate, month: selectedMonth }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Delete failed')
      showSuccess(data.message || `Deleted ${matchingEntries.length} entries`)
      setDeleteFromDate('')
      setDeleteToDate('')
      loadEntries()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to delete entries')
    } finally {
      setIsLoading(false)
    }
  }

  // CSV Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setCsvFile(file)
    setUploadResult(null)
    setCsvPreview([])
    setShowPreview(false)

    if (file) {
      // Parse preview
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        const lines = text.split('\n').filter(l => l.trim())
        // Skip header row
        const dataLines = lines.slice(1)
        const parsed = dataLines.map(line => {
          const cols = line.split(';')
          // Columns: Booking date;Amount;Sender;Recipient;Name;Title;Balance;Currency
          const date = (cols[0] || '').trim().replace(/\//g, '-')
          const amountStr = (cols[1] || '').trim().replace(',', '.')
          const amount = parseFloat(amountStr) || 0
          const title = (cols[5] || '').trim()
          const balanceStr = (cols[6] || '').trim().replace(',', '.')
          const balance = parseFloat(balanceStr) || 0
          return { date, amount, title, balance }
        }).filter(row => row.date && row.amount !== 0)
        setCsvPreview(parsed)
        setShowPreview(true)
      }
      reader.readAsText(file)
    }
  }

  const uploadCsv = async () => {
    clearMessages()
    if (!csvFile) { showError('Please select a CSV file'); return }

    setIsUploading(true)
    setUploadResult(null)
    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      formData.append('month', selectedMonth)

      const response = await fetch(`${API_BASE}/upload-csv`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Upload failed')

      setUploadResult({ success: true, message: data.message || 'CSV uploaded successfully', count: data.count })
      showSuccess(data.message || 'CSV uploaded and expenses updated')
      setCsvFile(null)
      setCsvPreview([])
      setShowPreview(false)
      // Reset file input
      const fileInput = document.getElementById('csv-file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      // Reload entries to reflect new data
      loadEntries()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to upload CSV'
      setUploadResult({ success: false, message: msg })
      showError(msg)
    } finally {
      setIsUploading(false)
    }
  }

  // Calculations
  const totalExpenses = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0)
  const totalLoans = entries.filter(e => e.type === 'loan').reduce((sum, e) => sum + e.amount, 0)
  const totalDeductions = totalExpenses + totalLoans
  const remaining = salaryRecord.salary - totalDeductions

  const expenseEntries = entries.filter(e => e.type === 'expense')
  const loanEntries = entries.filter(e => e.type === 'loan')
  const expenseCategories = categories.filter(c => c.type === 'expense')
  const loanCategories = categories.filter(c => c.type === 'loan')

  // Filtered entries for overview
  const filteredEntries = filterCategory
    ? entries.filter(e => e.categoryName === filterCategory)
    : entries
  const filteredTotal = filteredEntries.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="expenses-container">
      {/* TOAST */}
      {(errorMessage || successMessage) && (
        <div className="exp-toast-overlay">
          <div className={`exp-toast ${errorMessage ? 'exp-toast-error' : 'exp-toast-success'}`}>
            <span>{errorMessage || successMessage}</span>
            <button className="exp-toast-close" onClick={clearMessages}>×</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="exp-hero">
        <div>
          <h1>💰 Daily Expenses</h1>
          <p className="exp-subtitle">Track salary, expenses, and loan settlements.</p>
        </div>
        <div className="exp-month-picker">
          <label>Month:</label>
          <input type="month" className="form-control" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
        </div>
      </div>

      {/* SALARY SECTION */}
      <section className="card exp-salary-section">
        <div className="exp-salary-header">
          <h2>📊 Salary & Balance</h2>
        </div>
        <div className="exp-salary-grid">
          <div className="form-group">
            <label>Monthly Salary</label>
            <div className="exp-salary-input-row">
              <input
                type="number"
                className="form-control"
                placeholder="Enter salary"
                value={salaryInput}
                onChange={e => setSalaryInput(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" onClick={saveSalary} disabled={isLoading}>Save</button>
            </div>
          </div>
          <div className="exp-summary-cards">
            <div className="exp-summary-card exp-card-salary">
              <span className="exp-card-label">Salary</span>
              <span className="exp-card-value">₹{salaryRecord.salary.toLocaleString()}</span>
            </div>
            <div className="exp-summary-card exp-card-expense">
              <span className="exp-card-label">Expenses</span>
              <span className="exp-card-value">₹{totalExpenses.toLocaleString()}</span>
            </div>
            <div className="exp-summary-card exp-card-loan">
              <span className="exp-card-label">Loan/Lean</span>
              <span className="exp-card-value">₹{totalLoans.toLocaleString()}</span>
            </div>
            <div className={`exp-summary-card ${remaining >= 0 ? 'exp-card-remaining' : 'exp-card-negative'}`}>
              <span className="exp-card-label">Remaining</span>
              <span className="exp-card-value">₹{remaining.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </section>

      {/* TABS */}
      <div className="exp-tabs">
        <button className={`exp-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`exp-tab ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>Expenses</button>
        <button className={`exp-tab ${activeTab === 'loans' ? 'active' : ''}`} onClick={() => setActiveTab('loans')}>Loan Settlement</button>
        <button className={`exp-tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>Categories</button>
        <button className={`exp-tab ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>Upload CSV</button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <section className="card exp-tab-content">
          <div className="exp-tab-header">
            <h3>Monthly Breakdown</h3>
            <div className="exp-filter-row">
              <select className="form-control" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="">All Categories</option>
                {[...new Set(entries.map(e => e.categoryName))].filter(Boolean).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {filterCategory && <button className="btn btn-sm btn-secondary" onClick={() => setFilterCategory('')}>Clear</button>}
            </div>
          </div>

          {/* Delete by date range */}
          <div className="exp-delete-by-date">
            <span className="exp-delete-label">🗑️ Remove entries by date:</span>
            <div className="exp-delete-date-row">
              <input type="date" className="form-control" placeholder="From" value={deleteFromDate} onChange={e => setDeleteFromDate(e.target.value)} />
              <span>to</span>
              <input type="date" className="form-control" placeholder="To" value={deleteToDate} onChange={e => setDeleteToDate(e.target.value)} />
              <button className="btn btn-danger btn-sm" onClick={deleteByDateRange} disabled={isLoading || !deleteFromDate || !deleteToDate}>
                Delete Range
              </button>
            </div>
            {deleteFromDate && deleteToDate && (
              <span className="exp-delete-preview">
                {entries.filter(e => e.date >= deleteFromDate && e.date <= deleteToDate).length} entries will be deleted
              </span>
            )}
          </div>

          {filteredEntries.length === 0 ? (
            <p className="exp-empty">{filterCategory ? `No entries for "${filterCategory}" this month.` : 'No entries for this month yet.'}</p>
          ) : (
            <div className="table-wrapper">
              <table className="exp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry, i) => (
                    <tr key={entry.id ?? i} className={deleteFromDate && deleteToDate && entry.date >= deleteFromDate && entry.date <= deleteToDate ? 'exp-row-marked' : ''}>
                      <td className="exp-date-cell">{entry.date}</td>
                      <td><span className={`exp-type-badge ${entry.type}`}>{entry.type === 'expense' ? 'Expense' : 'Loan'}</span></td>
                      <td>{entry.categoryName}</td>
                      <td>{entry.description}</td>
                      <td className="exp-amount-cell">₹{entry.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}><strong>{filterCategory ? `Total (${filterCategory})` : 'Total Deductions'}</strong></td>
                    <td className="exp-amount-cell"><strong>₹{filteredTotal.toLocaleString()}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      )}

      {/* EXPENSES TAB */}
      {activeTab === 'expenses' && (
        <section className="card exp-tab-content">
          <div className="exp-tab-header">
            <h3>Expenses</h3>
            <button className="btn btn-primary btn-sm" onClick={() => openAddEntry('expense')}>+ Add Expense</button>
          </div>
          {expenseEntries.length === 0 ? (
            <p className="exp-empty">No expenses recorded this month.</p>
          ) : (
            <div className="table-wrapper">
              <table className="exp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseEntries.map((entry, i) => (
                    <tr key={entry.id ?? i}>
                      <td className="exp-date-cell">{entry.date}</td>
                      <td>{entry.categoryName}</td>
                      <td>{entry.description}</td>
                      <td className="exp-amount-cell">₹{entry.amount.toLocaleString()}</td>
                      <td className="exp-actions">
                        <button className="btn btn-sm btn-warning" onClick={() => openEditEntry(entry)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteEntry(entry)}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}><strong>Total</strong></td>
                    <td className="exp-amount-cell"><strong>₹{totalExpenses.toLocaleString()}</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      )}

      {/* LOANS TAB */}
      {activeTab === 'loans' && (
        <section className="card exp-tab-content">
          <div className="exp-tab-header">
            <h3>Loan & Lean Settlement</h3>
            <button className="btn btn-primary btn-sm" onClick={() => openAddEntry('loan')}>+ Add Settlement</button>
          </div>
          {loanEntries.length === 0 ? (
            <p className="exp-empty">No loan settlements this month.</p>
          ) : (
            <div className="table-wrapper">
              <table className="exp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loanEntries.map((entry, i) => (
                    <tr key={entry.id ?? i}>
                      <td className="exp-date-cell">{entry.date}</td>
                      <td>{entry.categoryName}</td>
                      <td>{entry.description}</td>
                      <td className="exp-amount-cell">₹{entry.amount.toLocaleString()}</td>
                      <td className="exp-actions">
                        <button className="btn btn-sm btn-warning" onClick={() => openEditEntry(entry)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteEntry(entry)}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}><strong>Total</strong></td>
                    <td className="exp-amount-cell"><strong>₹{totalLoans.toLocaleString()}</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      )}

      {/* CATEGORIES TAB */}
      {activeTab === 'categories' && (
        <section className="card exp-tab-content">
          <div className="exp-tab-header">
            <h3>Categories</h3>
            <button className="btn btn-primary btn-sm" onClick={openAddCategory}>+ Add Category</button>
          </div>

          {showCategoryForm && (
            <div className="exp-inline-form">
              <div className="exp-inline-form-grid">
                <div className="form-group">
                  <label>Category Name *</label>
                  <input type="text" className="form-control" placeholder="e.g. Home, Electricity, Rent" value={formCategory.name} onChange={e => setFormCategory({ ...formCategory, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Type *</label>
                  <select className="form-control" value={formCategory.type} onChange={e => setFormCategory({ ...formCategory, type: e.target.value as 'expense' | 'loan' })}>
                    <option value="expense">Expense</option>
                    <option value="loan">Loan / Lean</option>
                  </select>
                </div>
              </div>
              <div className="exp-inline-form-actions">
                <button className="btn btn-primary btn-sm" onClick={saveCategory} disabled={isLoading}>{isEditingCategory ? 'Update' : 'Save'}</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowCategoryForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="exp-cat-section">
            <h4>Expense Categories</h4>
            {expenseCategories.length === 0 ? (
              <p className="exp-empty">No expense categories yet.</p>
            ) : (
              <div className="exp-cat-list">
                {expenseCategories.map(cat => (
                  <div key={cat.id} className="exp-cat-item">
                    <span className="exp-cat-name">{cat.name}</span>
                    <div className="exp-cat-actions">
                      <button className="btn btn-sm btn-warning" onClick={() => openEditCategory(cat)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteCategory(cat)}>Del</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="exp-cat-section">
            <h4>Loan / Lean Categories</h4>
            {loanCategories.length === 0 ? (
              <p className="exp-empty">No loan categories yet.</p>
            ) : (
              <div className="exp-cat-list">
                {loanCategories.map(cat => (
                  <div key={cat.id} className="exp-cat-item">
                    <span className="exp-cat-name">{cat.name}</span>
                    <div className="exp-cat-actions">
                      <button className="btn btn-sm btn-warning" onClick={() => openEditCategory(cat)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteCategory(cat)}>Del</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* UPLOAD CSV TAB */}
      {activeTab === 'upload' && (
        <section className="card exp-tab-content">
          <div className="exp-tab-header">
            <h3>📤 Upload Bank CSV</h3>
          </div>
          <p className="exp-upload-desc">
            Upload your bank statement CSV file. The backend will parse it and update expenses in the database for the selected month.
          </p>

          <div className="exp-upload-info">
            <strong>Expected CSV format (semicolon-separated, Swedish bank format):</strong>
            <code className="exp-csv-format">Booking date;Amount;Sender;Recipient;Name;Title;Balance;Currency</code>
            <div className="exp-csv-example">
              <small>Example:</small>
              <pre>Booking date;Amount;Sender;Recipient;Name;Title;Balance;Currency{'\n'}2026/06/27;-49,00;3097 01 08427;;;Kortköp 260626 APPLE.COM/BILL;0,26;SEK{'\n'}2026/06/25;-350,00;3097 01 08427;;;Kortköp 260624 ICA SUPERMARKET;350,26;SEK</pre>
            </div>
          </div>

          <div className="exp-upload-area">
            <div className="exp-upload-input-row">
              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                className="form-control"
                onChange={handleFileChange}
              />
              <button
                className="btn btn-primary"
                onClick={uploadCsv}
                disabled={isUploading || !csvFile}
              >
                {isUploading ? 'Uploading...' : '⬆ Upload & Import'}
              </button>
            </div>

            {csvFile && (
              <div className="exp-file-info">
                <span>📄 {csvFile.name}</span>
                <span className="exp-file-size">({(csvFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}

            {uploadResult && (
              <div className={`exp-upload-result ${uploadResult.success ? 'success' : 'error'}`}>
                <span>{uploadResult.success ? '✅' : '❌'} {uploadResult.message}</span>
                {uploadResult.count !== undefined && (
                  <span className="exp-upload-count">{uploadResult.count} entries imported</span>
                )}
              </div>
            )}
          </div>

          {/* CSV Preview */}
          {showPreview && csvPreview.length > 0 && (
            <div className="exp-csv-preview">
              <div className="exp-preview-header">
                <h4>Preview ({csvPreview.length} transactions)</h4>
                <span className="exp-preview-total">
                  Total: {csvPreview.reduce((sum, r) => sum + r.amount, 0).toFixed(2)} SEK
                </span>
              </div>
              <div className="table-wrapper">
                <table className="exp-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Title</th>
                      <th>Amount</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, i) => (
                      <tr key={i}>
                        <td className="exp-date-cell">{row.date}</td>
                        <td>{row.title}</td>
                        <td className={`exp-amount-cell ${row.amount < 0 ? 'exp-negative' : 'exp-positive'}`}>
                          {row.amount.toFixed(2)}
                        </td>
                        <td className="exp-amount-cell">{row.balance.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showPreview && csvPreview.length === 0 && (
            <div className="exp-upload-result error">
              <span>⚠️ No valid transactions found in the file. Check the format.</span>
            </div>
          )}
        </section>
      )}

      {/* ENTRY FORM MODAL */}
      {showEntryForm && (
        <div className="exp-modal-overlay" onClick={() => setShowEntryForm(false)}>
          <div className="exp-modal" onClick={e => e.stopPropagation()}>
            <div className="exp-modal-header">
              <h3>{isEditingEntry ? 'Edit' : 'Add'} {formEntry.type === 'expense' ? 'Expense' : 'Loan Settlement'}</h3>
              <button className="exp-modal-close" onClick={() => setShowEntryForm(false)}>×</button>
            </div>

            <div className="exp-entry-form-grid">
              <div className="form-group">
                <label>Date *</label>
                <input type="date" className="form-control" value={formEntry.date} onChange={e => setFormEntry({ ...formEntry, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <select className="form-control" value={formEntry.categoryId} onChange={e => setFormEntry({ ...formEntry, categoryId: Number(e.target.value) })}>
                  <option value={0}>-- Select --</option>
                  {categories.filter(c => c.type === formEntry.type).map(c => (
                    <option key={c.id} value={c.id!}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Amount *</label>
                <input type="number" className="form-control" placeholder="0" value={formEntry.amount || ''} onChange={e => setFormEntry({ ...formEntry, amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="form-group exp-full-width">
                <label>Description</label>
                <input type="text" className="form-control" placeholder="Optional description" value={formEntry.description} onChange={e => setFormEntry({ ...formEntry, description: e.target.value })} />
              </div>
            </div>

            <div className="exp-modal-footer">
              <button className="btn btn-primary" onClick={saveEntry} disabled={isLoading}>{isEditingEntry ? 'Update' : 'Save'}</button>
              <button className="btn btn-secondary" onClick={() => setShowEntryForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Expenses
