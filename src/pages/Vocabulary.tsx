import { useState, useEffect, useCallback } from 'react'
import '../css/Vocabulary.css'

interface TenseDetails {
  id: number | null
  presentTense: string
  presentExample: string
  pastTense: string
  pastExample: string
  futureTense: string
  futureExample: string
}

interface VocabWord {
  id: number | null
  word: string
  meaning: string
  comment: string
  category: string
  article: 'en' | 'ett' | ''
  book: string
  page: string
  tenseDetails: TenseDetails | null
}

const API_BASE = '/api/vocabulary'

const CATEGORIES = [
  { value: 'NOUN', displayName: 'Noun' },
  { value: 'VERB', displayName: 'Verb' },
  { value: 'ADJECTIVE', displayName: 'Adjective' },
  { value: 'ADVERB', displayName: 'Adverb' },
  { value: 'PRONOUN', displayName: 'Pronoun' },
  { value: 'PREPOSITION', displayName: 'Preposition' },
  { value: 'CONJUNCTION', displayName: 'Conjunction' },
  { value: 'PHRASE', displayName: 'Phrase' },
  { value: 'COMMON', displayName: 'Common' },
  { value: 'OTHER', displayName: 'Other' },
]

function getEmptyTense(): TenseDetails {
  return {
    id: null,
    presentTense: '',
    presentExample: '',
    pastTense: '',
    pastExample: '',
    futureTense: '',
    futureExample: '',
  }
}

function getEmptyWord(): VocabWord {
  return {
    id: null,
    word: '',
    meaning: '',
    comment: '',
    category: 'COMMON',
    article: '',
    book: '',
    page: '',
    tenseDetails: getEmptyTense(),
  }
}

const PAGE_SIZE = 10

function Vocabulary() {
  const [words, setWords] = useState<VocabWord[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formWord, setFormWord] = useState<VocabWord>(getEmptyWord())
  const [isEditing, setIsEditing] = useState(false)
  const [showTense, setShowTense] = useState(false)

  // Comment popup
  const [showCommentPopup, setShowCommentPopup] = useState(false)
  const [commentWord, setCommentWord] = useState<VocabWord | null>(null)
  const [commentText, setCommentText] = useState('')

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [bookFilter, setBookFilter] = useState('')

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

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

  const loadWords = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/list`)
      if (!response.ok) throw new Error('API error')
      const data = await response.json()
      setWords(data.data || data || [])
    } catch {
      setWords([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWords()
  }, [loadWords])

  const openAddForm = () => {
    clearMessages()
    const searchValue = search.trim()
    const newWord = getEmptyWord()
    if (searchValue) {
      newWord.word = searchValue
      newWord.meaning = searchValue
    }
    setFormWord(newWord)
    setIsEditing(false)
    setShowTense(false)
    setShowForm(true)
  }

  const openEditForm = (word: VocabWord) => {
    setFormWord({
      ...word,
      tenseDetails: word.tenseDetails || getEmptyTense(),
    })
    setIsEditing(true)
    // Show tense if word has tense data
    const hasTense = word.tenseDetails &&
      (word.tenseDetails.presentTense || word.tenseDetails.pastTense || word.tenseDetails.futureTense)
    setShowTense(!!hasTense)
    setShowForm(true)
    clearMessages()
  }

  const closeForm = () => {
    setShowForm(false)
    setFormWord(getEmptyWord())
    setShowTense(false)
  }

  const saveWord = async () => {
    clearMessages()

    if (!formWord.word.trim()) {
      showError('Swedish word is required')
      return
    }
    if (!formWord.meaning.trim()) {
      showError('Meaning is required')
      return
    }

    // If tense is hidden, don't send tense data
    const wordToSave = showTense ? formWord : { ...formWord, tenseDetails: null }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wordToSave),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Save failed')
      showSuccess(`✓ Added: "${wordToSave.word}" — ${wordToSave.meaning} [${getCategoryDisplay(wordToSave.category)}]`)
      setShowForm(false)
      setFormWord(getEmptyWord())
      setShowTense(false)
      setSearch('')
      loadWords()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to save word')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteWord = async (word: VocabWord) => {
    if (!word.id) return
    if (!confirm(`Delete "${word.word}" (${word.meaning})?`)) return

    clearMessages()
    try {
      const response = await fetch(`${API_BASE}/delete/${word.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
      showSuccess('Word deleted successfully')
      loadWords()
    } catch {
      showError('Failed to delete word')
    }
  }

  // Comment popup
  const openCommentPopup = (word: VocabWord) => {
    setCommentWord(word)
    setCommentText(word.comment || '')
    setShowCommentPopup(true)
  }

  const saveComment = async () => {
    if (!commentWord) return
    const updated = { ...commentWord, comment: commentText }
    try {
      const response = await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (!response.ok) throw new Error('Save failed')
      showSuccess('Comment saved')
      setShowCommentPopup(false)
      setCommentWord(null)
      loadWords()
    } catch {
      showError('Failed to save comment')
    }
  }

  const updateTense = (field: keyof TenseDetails, value: string) => {
    setFormWord((prev) => ({
      ...prev,
      tenseDetails: {
        ...(prev.tenseDetails || getEmptyTense()),
        [field]: value,
      },
    }))
  }

  // Filtering
  const filteredWords = words.filter((w) => {
    const matchesSearch =
      !search ||
      w.word.toLowerCase().includes(search.toLowerCase()) ||
      w.meaning.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !categoryFilter || w.category === categoryFilter
    const matchesBook = !bookFilter || w.book === bookFilter
    return matchesSearch && matchesCategory && matchesBook
  })

  // Collect unique books from words for filter dropdown
  const bookOptions = [...new Set(words.map(w => w.book).filter(Boolean))]

  // Pagination
  const totalPages = Math.ceil(filteredWords.length / PAGE_SIZE) || 1
  const pagedWords = filteredWords.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [search, categoryFilter, bookFilter])

  const getCategoryDisplay = (cat: string) => {
    const found = CATEGORIES.find((c) => c.value === cat)
    return found ? found.displayName : cat
  }

  return (
    <div className="vocab-container">
      {/* TOAST POPUP */}
      {(errorMessage || successMessage) && (
        <div className="vocab-toast-overlay">
          <div className={`vocab-toast ${errorMessage ? 'vocab-toast-error' : 'vocab-toast-success'}`}>
            <span>{errorMessage || successMessage}</span>
            <button className="vocab-toast-close" onClick={clearMessages}>×</button>
          </div>
        </div>
      )}

      {/* COMMENT POPUP */}
      {showCommentPopup && commentWord && (
        <div className="vocab-modal-overlay" onClick={() => setShowCommentPopup(false)}>
          <div className="vocab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vocab-modal-header">
              <h3>Usage / Comment</h3>
              <span className="vocab-modal-word">{commentWord.word} — {commentWord.meaning}</span>
            </div>
            <textarea
              className="vocab-modal-textarea"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add usage examples, notes, or comments..."
              rows={6}
            />
            <div className="vocab-modal-actions">
              <button className="btn btn-primary" onClick={saveComment}>
                Save
              </button>
              <button className="btn btn-secondary" onClick={() => setShowCommentPopup(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="vocab-hero">
        <div>
          <h1>🇸🇪 Swedish Vocabulary</h1>
          <p className="vocab-subtitle">
            Build your Swedish vocabulary with words, tenses, and usage examples.
          </p>
        </div>
      </div>

      {/* QUICK STATS + ADD BUTTON ROW */}
      <div className="vocab-toolbar">
        <div className="vocab-stats">
          <div className="vocab-stat-item">
            <span className="vocab-stat-number">{words.length}</span>
            <span className="vocab-stat-label">Total</span>
          </div>
          <div className="vocab-stat-item">
            <span className="vocab-stat-number">
              {new Set(words.map((w) => w.category)).size}
            </span>
            <span className="vocab-stat-label">Categories</span>
          </div>
          <div className="vocab-stat-item">
            <span className="vocab-stat-number">
              {words.filter((w) => w.tenseDetails?.presentTense).length}
            </span>
            <span className="vocab-stat-label">Tenses</span>
          </div>
        </div>
      </div>

      {/* ADD / EDIT FORM — compact with tense toggle */}
      {showForm && (
        <section className="card vocab-form-section">
          <div className="vocab-form-header">
            <h2>{isEditing ? '✏️ Edit Word' : '➕ Add New Word'}</h2>
            <div className="vocab-form-header-actions">
              <button className="btn btn-primary btn-sm" onClick={saveWord} disabled={isLoading}>
                {isEditing ? '✓ Update' : '✓ Save'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={closeForm}>✕ Cancel</button>
            </div>
          </div>

          <div className="vocab-form-grid-3">
            <div className="form-group">
              <label>Swedish Word *</label>
              <input
                type="text"
                className="form-control"
                placeholder="en fru"
                value={formWord.word}
                onChange={(e) => setFormWord({ ...formWord, word: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Meaning *</label>
              <input
                type="text"
                className="form-control"
                placeholder="wife"
                value={formWord.meaning}
                onChange={(e) => setFormWord({ ...formWord, meaning: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select
                className="form-control"
                value={formWord.category}
                onChange={(e) => setFormWord({ ...formWord, category: e.target.value })}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="vocab-article-row">
            <label>Article:</label>
            <div className="vocab-article-options">
              <label className={`vocab-radio-btn ${formWord.article === 'en' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="article"
                  value="en"
                  checked={formWord.article === 'en'}
                  onChange={() => setFormWord({ ...formWord, article: 'en' })}
                />
                En
              </label>
              <label className={`vocab-radio-btn ${formWord.article === 'ett' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="article"
                  value="ett"
                  checked={formWord.article === 'ett'}
                  onChange={() => setFormWord({ ...formWord, article: 'ett' })}
                />
                Ett
              </label>
              <label className={`vocab-radio-btn ${formWord.article === '' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="article"
                  value=""
                  checked={formWord.article === ''}
                  onChange={() => setFormWord({ ...formWord, article: '' })}
                />
                None
              </label>
            </div>
          </div>

          <div className="vocab-form-grid-2">
            <div className="form-group">
              <label>Comment / Usage</label>
              <input
                type="text"
                className="form-control"
                placeholder="Hon är min fru."
                value={formWord.comment}
                onChange={(e) => setFormWord({ ...formWord, comment: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Book</label>
              <input
                type="text"
                className="form-control"
                placeholder="Book name"
                list="book-options"
                value={formWord.book}
                onChange={(e) => setFormWord({ ...formWord, book: e.target.value })}
              />
              <datalist id="book-options">
                {bookOptions.map((book) => (
                  <option key={book} value={book} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label>Page</label>
              <input
                type="text"
                className="form-control"
                placeholder="Page no."
                value={formWord.page}
                onChange={(e) => setFormWord({ ...formWord, page: e.target.value })}
              />
            </div>
          </div>

          {/* Tense toggle */}
          <div className="vocab-tense-toggle">
            <button
              className={`btn btn-sm ${showTense ? 'btn-warning' : 'btn-secondary'}`}
              onClick={() => setShowTense(!showTense)}
            >
              {showTense ? '▼ Hide Tenses' : '▶ Add Tenses (optional)'}
            </button>
          </div>

          {showTense && (
            <div className="tense-grid">
              <div className="tense-card">
                <h4>Present</h4>
                <div className="form-group">
                  <label>Form</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="går"
                    value={formWord.tenseDetails?.presentTense || ''}
                    onChange={(e) => updateTense('presentTense', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Example</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Jag går hem."
                    value={formWord.tenseDetails?.presentExample || ''}
                    onChange={(e) => updateTense('presentExample', e.target.value)}
                  />
                </div>
              </div>

              <div className="tense-card">
                <h4>Past</h4>
                <div className="form-group">
                  <label>Form</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="gick"
                    value={formWord.tenseDetails?.pastTense || ''}
                    onChange={(e) => updateTense('pastTense', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Example</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Jag gick hem."
                    value={formWord.tenseDetails?.pastExample || ''}
                    onChange={(e) => updateTense('pastExample', e.target.value)}
                  />
                </div>
              </div>

              <div className="tense-card">
                <h4>Future</h4>
                <div className="form-group">
                  <label>Form</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ska gå"
                    value={formWord.tenseDetails?.futureTense || ''}
                    onChange={(e) => updateTense('futureTense', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Example</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Jag ska gå hem."
                    value={formWord.tenseDetails?.futureExample || ''}
                    onChange={(e) => updateTense('futureExample', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* FILTER + LIST */}
      <section className="card vocab-list-section">
        <div className="vocab-list-header">
          <h2>📖 Vocabulary List</h2>
          <span className="vocab-count">{filteredWords.length} word(s)</span>
        </div>

        <div className="vocab-filter-row">
          <button className="btn btn-primary vocab-add-btn" onClick={openAddForm}>
            + Add Word
          </button>
          <input
            type="text"
            className="form-control"
            placeholder="Search word or meaning..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-control"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.displayName}
              </option>
            ))}
          </select>
          <select
            className="form-control"
            value={bookFilter}
            onChange={(e) => setBookFilter(e.target.value)}
          >
            <option value="">All Books</option>
            {bookOptions.map((book) => (
              <option key={book} value={book}>{book}</option>
            ))}
          </select>
          {(search || categoryFilter || bookFilter) && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => { setSearch(''); setCategoryFilter(''); setBookFilter('') }}
            >
              Clear
            </button>
          )}
        </div>

        {isLoading && (
          <div className="loading-text">
            <strong>Loading...</strong>
          </div>
        )}

        {filteredWords.length === 0 && !isLoading ? (
          <div className="vocab-empty">
            <p>No words found.</p>
            <button className="btn btn-primary" onClick={openAddForm}>
              + Add Word
            </button>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="vocab-table">
                <thead>
                  <tr>
                    <th>En/Ett</th>
                    <th>Swedish</th>
                    <th>Meaning</th>
                    <th>Book/Pg</th>
                    <th>Category</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedWords.map((w, index) => (
                    <tr key={w.id ?? index}>
                      <td>{w.article ? <span className={`vocab-article-tag ${w.article}`}>{w.article}</span> : '—'}</td>
                      <td className="vocab-word-cell">{w.word}</td>
                      <td>{w.meaning}</td>
                      <td className="vocab-book-cell">{w.book ? `${w.book}${w.page ? ' / p.' + w.page : ''}` : '—'}</td>
                      <td>
                        <span className="vocab-badge">{getCategoryDisplay(w.category)}</span>
                      </td>
                      <td className="vocab-actions">
                        <button
                          className="btn btn-sm btn-info"
                          title="Comment"
                          onClick={() => openCommentPopup(w)}
                        >
                          💬
                        </button>
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => openEditForm(w)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => deleteWord(w)}
                        >
                          Del
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="vocab-pagination">
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <div className="vocab-pagination-buttons">
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

export default Vocabulary
