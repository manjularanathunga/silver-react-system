import { useState, useEffect, useCallback } from 'react'
import '../css/Expenses.css'

interface ExpenseCategory {
  id: number | null
  name: string
  type: 'income' | 'salary' | 'expense' | 'payment' | 'autogiro' | 'transfer' | 'loan'
  mappingText: string
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

const API_BASE = '/api/expenses'

function getEmptyCategory(): ExpenseCategory {
  return { id: null, name: '', type: 'expense', mappingText: '' }
}

function getEmptyEntry(): ExpenseEntry {
  return { id: null, categoryId: 0, categoryName: '', description: '', amount: 0, date: '', type: 'expense' }
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function Expenses() {
  // Month
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
  const [filterCategories, setFilterCategories] = useState<string[]>([])
  const [filterType, setFilterType] = useState('')
  const [filterSearch, setFilterSearch] = useState('')

  // Pagination
  const [overviewPage, setOverviewPage] = useState(1)
  const [expensePage, setExpensePage] = useState(1)
  const [loanPage, setLoanPage] = useState(1)
  const EXP_PAGE_SIZE = 10

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

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { loadEntries() }, [loadEntries])

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

      // After upload, trigger recategorize
      const recatResponse = await fetch(`${API_BASE}/entries/recategorize?month=${selectedMonth}`, { method: 'POST' })
      const recatData = await recatResponse.json()
      const recatMsg = recatResponse.ok ? ` → ${recatData.message || `Recategorized ${recatData.data} entries`}` : ''

      setUploadResult({ success: true, message: (data.message || 'CSV uploaded') + recatMsg, count: data.count })
      showSuccess((data.message || 'CSV uploaded') + recatMsg)
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

  const recategorize = async () => {
    clearMessages()
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/entries/recategorize?month=${selectedMonth}`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Recategorize failed')
      showSuccess(data.message || `Recategorized ${data.data} entries`)
      loadEntries()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to recategorize')
    } finally {
      setIsLoading(false)
    }
  }

  // Calculations — salary/income types are earnings, transfers excluded, rest are deductions
  const earningTypes = ['salary', 'income']
  const deductionTypes = ['expense', 'payment', 'autogiro', 'loan']
  const excludeTypes = ['transfer']

  const earningCategories = categories.filter(c => earningTypes.includes(c.type)).map(c => c.name)
  const transferCategories = categories.filter(c => excludeTypes.includes(c.type)).map(c => c.name)

  const salary = entries.filter(e => earningCategories.includes(e.categoryName) || e.description?.toLowerCase().includes('lön')).reduce((sum, e) => sum + e.amount, 0)
  const isTransferEntry = (e: ExpenseEntry) => transferCategories.includes(e.categoryName) || e.description?.toLowerCase().includes('överföring')
  const totalExpenses = entries.filter(e => (e.type === 'expense' || e.type === 'loan') && !earningCategories.includes(e.categoryName) && !isTransferEntry(e) && !e.description?.toLowerCase().includes('lön')).reduce((sum, e) => sum + e.amount, 0)
  const totalLoans = entries.filter(e => e.type === 'loan' && !isTransferEntry(e)).reduce((sum, e) => sum + e.amount, 0)
  const totalDeductions = totalExpenses + totalLoans
  const remaining = salary - totalDeductions

  const expenseEntries = entries.filter(e => (e.type === 'expense' || e.type === 'loan') && !earningCategories.includes(e.categoryName) && !isTransferEntry(e) && !e.description?.toLowerCase().includes('lön'))
  const loanEntries = entries.filter(e => e.type === 'loan' && !isTransferEntry(e))
  const expenseCategories = categories.filter(c => c.type === 'expense')
  const loanCategories = categories.filter(c => c.type === 'loan')
  const transferCats = categories.filter(c => c.type === 'transfer')
  const salaryCats = categories.filter(c => c.type === 'salary')
  const incomeCats = categories.filter(c => c.type === 'income')
  const paymentCats = categories.filter(c => c.type === 'payment')
  const autogiroCats = categories.filter(c => c.type === 'autogiro')

  // Filtered entries for overview
  const filteredEntries = entries.filter(e => {
    if (filterCategories.length > 0 && !filterCategories.includes('__none__') && !filterCategories.includes(e.categoryName)) return false
    if (filterCategories.includes('__none__')) return false
    if (filterType && e.type !== filterType) return false
    if (filterSearch && !e.description?.toLowerCase().includes(filterSearch.toLowerCase())) return false
    return true
  })
  const filteredTotal = filteredEntries.reduce((sum, e) => sum + e.amount, 0)

  // Pagination calculations
  const overviewTotalPages = Math.ceil(filteredEntries.length / EXP_PAGE_SIZE) || 1
  const pagedOverview = filteredEntries.slice((overviewPage - 1) * EXP_PAGE_SIZE, overviewPage * EXP_PAGE_SIZE)

  const expenseTotalPages = Math.ceil(expenseEntries.length / EXP_PAGE_SIZE) || 1
  const pagedExpenses = expenseEntries.slice((expensePage - 1) * EXP_PAGE_SIZE, expensePage * EXP_PAGE_SIZE)

  const loanTotalPages = Math.ceil(loanEntries.length / EXP_PAGE_SIZE) || 1
  const pagedLoans = loanEntries.slice((loanPage - 1) * EXP_PAGE_SIZE, loanPage * EXP_PAGE_SIZE)

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
          <p className="exp-subtitle">Track expenses and loan settlements.</p>
        </div>
        <div className="exp-month-picker">
          <label>Month:</label>
          <input type="month" className="form-control" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <section className="card exp-salary-section">
        <div className="exp-summary-cards">
          <div className="exp-summary-card exp-card-salary">
            <span className="exp-card-label">Salary/Income</span>
            <span className="exp-card-value">{salary.toLocaleString()} SEK</span>
          </div>
          <div className="exp-summary-card exp-card-expense">
            <span className="exp-card-label">Expenses</span>
            <span className="exp-card-value">{totalExpenses.toLocaleString()} SEK</span>
          </div>
          <div className="exp-summary-card exp-card-loan">
            <span className="exp-card-label">Loan/Lean</span>
            <span className="exp-card-value">{totalLoans.toLocaleString()} SEK</span>
          </div>
          <div className="exp-summary-card exp-card-total">
            <span className="exp-card-label">Monthly Total</span>
            <span className="exp-card-value">{totalDeductions.toLocaleString()} SEK</span>
          </div>
          <div className={`exp-summary-card ${remaining >= 0 ? 'exp-card-remaining' : 'exp-card-negative'}`}>
            <span className="exp-card-label">Remaining</span>
            <span className="exp-card-value">{remaining.toLocaleString()} SEK</span>
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
            <div className="exp-tab-header-actions">
              <button className="btn btn-sm btn-secondary" onClick={loadEntries} disabled={isLoading}>🔄 Reload</button>
              <button className="btn btn-sm btn-info" onClick={recategorize} disabled={isLoading} title="Re-assign categories based on mapping text">🏷️ Recategorize</button>
            </div>
          </div>

          <div className="exp-filter-bar">
            <input type="text" className="form-control" placeholder="🔍 Search description..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
            <div className="exp-cat-filter-dropdown">
              <button className="btn btn-sm btn-secondary exp-cat-filter-btn" onClick={() => {
                const el = document.getElementById('exp-cat-dropdown')
                if (el) el.classList.toggle('open')
              }}>
                📂 Categories ({filterCategories.length === 0 ? 'All' : filterCategories.length})
              </button>
              <div id="exp-cat-dropdown" className="exp-cat-dropdown">
                <div className="exp-cat-check-actions">
                  <button className="exp-cat-action-btn" onClick={() => setFilterCategories([])}>✓ Select All</button>
                  <button className="exp-cat-action-btn" onClick={() => setFilterCategories(['__none__'])}>✕ Unselect All</button>
                </div>
                {[...new Set(entries.map(e => e.categoryName))].filter(Boolean).sort().map(cat => (
                  <label key={cat} className="exp-cat-check-item">
                    <input type="checkbox" checked={filterCategories.length === 0 || (filterCategories.includes(cat) && !filterCategories.includes('__none__'))} onChange={() => {
                      if (filterCategories.includes('__none__')) {
                        // Was unselect all, now select only this one
                        setFilterCategories([cat])
                      } else if (filterCategories.length === 0) {
                        // Was "all", now deselect this one
                        const allCats = [...new Set(entries.map(e => e.categoryName))].filter(Boolean).filter(c => c !== cat)
                        setFilterCategories(allCats)
                      } else if (filterCategories.includes(cat)) {
                        const newList = filterCategories.filter(c => c !== cat)
                        setFilterCategories(newList.length === 0 ? ['__none__'] : newList)
                      } else {
                        setFilterCategories([...filterCategories, cat])
                      }
                    }} />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>
            <select className="form-control" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option value="expense">Expense</option>
              <option value="loan">Loan</option>
              <option value="income">Income</option>
              <option value="salary">Salary</option>
              <option value="payment">Payment</option>
              <option value="autogiro">Autogiro</option>
              <option value="transfer">Transfer</option>
            </select>
            {(filterCategories.length > 0 || filterType || filterSearch) && (
              <button className="btn btn-sm btn-secondary" onClick={() => { setFilterCategories([]); setFilterType(''); setFilterSearch('') }}>Clear</button>
            )}
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
            <p className="exp-empty">{filterCategories.length > 0 ? `No entries for selected categories this month.` : 'No entries for this month yet.'}</p>
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
                  {pagedOverview.map((entry, i) => (
                    <tr key={entry.id ?? i} className={deleteFromDate && deleteToDate && entry.date >= deleteFromDate && entry.date <= deleteToDate ? 'exp-row-marked' : ''}>
                      <td className="exp-date-cell">{entry.date}</td>
                      <td><span className={`exp-type-badge ${entry.type}`}>{entry.type === 'expense' ? 'Expense' : 'Loan'}</span></td>
                      <td>{entry.categoryName}</td>
                      <td>{entry.description}</td>
                      <td className="exp-amount-cell">{entry.amount.toLocaleString()} SEK</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}><strong>{filterCategories.length > 0 ? `Total (${filterCategories.join(', ')})` : 'Total Deductions'}</strong></td>
                    <td className="exp-amount-cell"><strong>{filteredTotal.toLocaleString()} SEK</strong></td>
                  </tr>
                </tfoot>
              </table>
              {overviewTotalPages > 1 && (
                <div className="exp-pagination">
                  <button className="exp-page-btn" onClick={() => setOverviewPage(p => Math.max(1, p - 1))} disabled={overviewPage === 1}>← Prev</button>
                  <span className="exp-page-info">Page {overviewPage} of {overviewTotalPages} ({filteredEntries.length} entries)</span>
                  <button className="exp-page-btn" onClick={() => setOverviewPage(p => Math.min(overviewTotalPages, p + 1))} disabled={overviewPage === overviewTotalPages}>Next →</button>
                </div>
              )}
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
                  {pagedExpenses.map((entry, i) => (
                    <tr key={entry.id ?? i}>
                      <td className="exp-date-cell">{entry.date}</td>
                      <td>{entry.categoryName}</td>
                      <td>{entry.description}</td>
                      <td className="exp-amount-cell">{entry.amount.toLocaleString()} SEK</td>
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
                    <td className="exp-amount-cell"><strong>{totalExpenses.toLocaleString()} SEK</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              {expenseTotalPages > 1 && (
                <div className="exp-pagination">
                  <button className="exp-page-btn" onClick={() => setExpensePage(p => Math.max(1, p - 1))} disabled={expensePage === 1}>← Prev</button>
                  <span className="exp-page-info">Page {expensePage} of {expenseTotalPages} ({expenseEntries.length} entries)</span>
                  <button className="exp-page-btn" onClick={() => setExpensePage(p => Math.min(expenseTotalPages, p + 1))} disabled={expensePage === expenseTotalPages}>Next →</button>
                </div>
              )}
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
                  {pagedLoans.map((entry, i) => (
                    <tr key={entry.id ?? i}>
                      <td className="exp-date-cell">{entry.date}</td>
                      <td>{entry.categoryName}</td>
                      <td>{entry.description}</td>
                      <td className="exp-amount-cell">{entry.amount.toLocaleString()} SEK</td>
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
                    <td className="exp-amount-cell"><strong>{totalLoans.toLocaleString()} SEK</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              {loanTotalPages > 1 && (
                <div className="exp-pagination">
                  <button className="exp-page-btn" onClick={() => setLoanPage(p => Math.max(1, p - 1))} disabled={loanPage === 1}>← Prev</button>
                  <span className="exp-page-info">Page {loanPage} of {loanTotalPages} ({loanEntries.length} entries)</span>
                  <button className="exp-page-btn" onClick={() => setLoanPage(p => Math.min(loanTotalPages, p + 1))} disabled={loanPage === loanTotalPages}>Next →</button>
                </div>
              )}
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
              <div className="exp-cat-form-grid">
                <div className="form-group">
                  <label>Category Name *</label>
                  <input type="text" className="form-control" placeholder="e.g. Groceries, Home Loan" value={formCategory.name} onChange={e => setFormCategory({ ...formCategory, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Type *</label>
                  <select className="form-control" value={formCategory.type} onChange={e => setFormCategory({ ...formCategory, type: e.target.value as ExpenseCategory['type'] })}>
                    <option value="income">Income</option>
                    <option value="salary">Salary</option>
                    <option value="expense">Expense</option>
                    <option value="payment">Payment</option>
                    <option value="autogiro">Autogiro</option>
                    <option value="transfer">Transfer</option>
                    <option value="loan">Loan / Lean</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Mapping Text</label>
                  <input type="text" className="form-control" placeholder="e.g. ICA, Överföring, Lön" value={formCategory.mappingText} onChange={e => setFormCategory({ ...formCategory, mappingText: e.target.value })} />
                </div>
              </div>
              <p className="exp-mapping-hint">Mapping text is used to auto-categorize entries from bank CSV imports.</p>
              <div className="exp-inline-form-actions">
                <button className="btn btn-primary btn-sm" onClick={saveCategory} disabled={isLoading}>{isEditingCategory ? 'Update' : 'Save'}</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowCategoryForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="exp-cat-grid">
            <div className="exp-cat-section">
              <h4><span className="exp-cat-type-icon income">📈</span> Income</h4>
              {incomeCats.length === 0 ? (
                <p className="exp-empty">No income categories.</p>
              ) : (
                <div className="exp-cat-list">
                  {incomeCats.map(cat => (
                    <div key={cat.id} className="exp-cat-item">
                      <div className="exp-cat-info">
                        <span className="exp-cat-name">{cat.name}</span>
                        {cat.mappingText && <span className="exp-cat-mapping">↔ {cat.mappingText}</span>}
                      </div>
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
              <h4><span className="exp-cat-type-icon salary">💰</span> Salary</h4>
              {salaryCats.length === 0 ? (
                <p className="exp-empty">No salary categories.</p>
              ) : (
                <div className="exp-cat-list">
                  {salaryCats.map(cat => (
                    <div key={cat.id} className="exp-cat-item">
                      <div className="exp-cat-info">
                        <span className="exp-cat-name">{cat.name}</span>
                        {cat.mappingText && <span className="exp-cat-mapping">↔ {cat.mappingText}</span>}
                      </div>
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
              <h4><span className="exp-cat-type-icon expense">💸</span> Expense</h4>
              {expenseCategories.length === 0 ? (
                <p className="exp-empty">No expense categories.</p>
              ) : (
                <div className="exp-cat-list">
                  {expenseCategories.map(cat => (
                    <div key={cat.id} className="exp-cat-item">
                      <div className="exp-cat-info">
                        <span className="exp-cat-name">{cat.name}</span>
                        {cat.mappingText && <span className="exp-cat-mapping">↔ {cat.mappingText}</span>}
                      </div>
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
              <h4><span className="exp-cat-type-icon payment">💳</span> Payment</h4>
              {paymentCats.length === 0 ? (
                <p className="exp-empty">No payment categories.</p>
              ) : (
                <div className="exp-cat-list">
                  {paymentCats.map(cat => (
                    <div key={cat.id} className="exp-cat-item">
                      <div className="exp-cat-info">
                        <span className="exp-cat-name">{cat.name}</span>
                        {cat.mappingText && <span className="exp-cat-mapping">↔ {cat.mappingText}</span>}
                      </div>
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
              <h4><span className="exp-cat-type-icon autogiro">🔁</span> Autogiro</h4>
              {autogiroCats.length === 0 ? (
                <p className="exp-empty">No autogiro categories.</p>
              ) : (
                <div className="exp-cat-list">
                  {autogiroCats.map(cat => (
                    <div key={cat.id} className="exp-cat-item">
                      <div className="exp-cat-info">
                        <span className="exp-cat-name">{cat.name}</span>
                        {cat.mappingText && <span className="exp-cat-mapping">↔ {cat.mappingText}</span>}
                      </div>
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
              <h4><span className="exp-cat-type-icon transfer">🔄</span> Transfer</h4>
              {transferCats.length === 0 ? (
                <p className="exp-empty">No transfer categories.</p>
              ) : (
                <div className="exp-cat-list">
                  {transferCats.map(cat => (
                    <div key={cat.id} className="exp-cat-item">
                      <div className="exp-cat-info">
                        <span className="exp-cat-name">{cat.name}</span>
                        {cat.mappingText && <span className="exp-cat-mapping">↔ {cat.mappingText}</span>}
                      </div>
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
              <h4><span className="exp-cat-type-icon loan">🏦</span> Loan / Lean</h4>
              {loanCategories.length === 0 ? (
                <p className="exp-empty">No loan categories.</p>
              ) : (
                <div className="exp-cat-list">
                  {loanCategories.map(cat => (
                    <div key={cat.id} className="exp-cat-item">
                      <div className="exp-cat-info">
                        <span className="exp-cat-name">{cat.name}</span>
                        {cat.mappingText && <span className="exp-cat-mapping">↔ {cat.mappingText}</span>}
                      </div>
                      <div className="exp-cat-actions">
                        <button className="btn btn-sm btn-warning" onClick={() => openEditCategory(cat)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteCategory(cat)}>Del</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
