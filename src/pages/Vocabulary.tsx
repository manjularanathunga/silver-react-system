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
  return { id: null, presentTense: '', presentExample: '', pastTense: '', pastExample: '', futureTense: '', futureExample: '' }
}

function getEmptyWord(): VocabWord {
  return { id: null, word: '', meaning: '', comment: '', category: 'COMMON', article: '', book: '', page: '', tenseDetails: getEmptyTense() }
}

const PAGE_SIZE = 15

function Vocabulary() {
  const [words, setWords] = useState<VocabWord[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formWord, setFormWord] = useState<VocabWord>(getEmptyWord())
  const [isEditing, setIsEditing] = useState(false)
  const [showTense, setShowTense] = useState(false)
  const [expandedWord, setExpandedWord] = useState<number | null>(null)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [bookFilter, setBookFilter] = useState('')

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const clearMessages = () => { setSuccessMessage(''); setErrorMessage('') }
  const showSuccess = (msg: string) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(''), 3000) }
  const showError = (msg: string) => { setErrorMessage(msg); setTimeout(() => setErrorMessage(''), 4000) }

  const loadWords = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/list`)
      if (!response.ok) throw new Error('API error')
      const data = await response.json()
      setWords(data.data || data || [])
    } catch { setWords([]) }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { loadWords() }, [loadWords])

  const openAddForm = () => {
    clearMessages()
    const searchValue = search.trim()
    const newWord = getEmptyWord()
    if (searchValue) { newWord.word = searchValue; newWord.meaning = searchValue }
    setFormWord(newWord)
    setIsEditing(false)
    setShowTense(false)
    setShowForm(true)
  }

  const openEditForm = (word: VocabWord) => {
    setFormWord({ ...word, tenseDetails: word.tenseDetails || getEmptyTense() })
    setIsEditing(true)
    const hasTense = word.tenseDetails && (word.tenseDetails.presentTense || word.tenseDetails.pastTense || word.tenseDetails.futureTense)
    setShowTense(!!hasTense)
    setShowForm(true)
    clearMessages()
  }

  const closeForm = () => { setShowForm(false); setFormWord(getEmptyWord()); setShowTense(false) }

  const toCamelCase = (str: string) =>
    str.trim().split(/\s+/).map(w => w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')

  const saveWord = async () => {
    clearMessages()
    if (!formWord.word.trim()) { showError('Swedish word is required'); return }
    if (!formWord.meaning.trim()) { showError('Meaning is required'); return }

    const baseWord = showTense ? formWord : { ...formWord, tenseDetails: null }
    const wordToSave = { ...baseWord, word: toCamelCase(baseWord.word), meaning: toCamelCase(baseWord.meaning) }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wordToSave),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Save failed')
      showSuccess(`✓ ${isEditing ? 'Updated' : 'Added'}: "${wordToSave.word}" — ${wordToSave.meaning} [${getCategoryDisplay(wordToSave.category)}]`)
      setShowForm(false)
      setFormWord(getEmptyWord())
      setShowTense(false)
      setSearch('')
      loadWords()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to save word')
    } finally { setIsLoading(false) }
  }

  const deleteWord = async (word: VocabWord) => {
    if (!word.id) return
    if (!confirm(`Delete "${word.word}"?`)) return
    clearMessages()
    try {
      const response = await fetch(`${API_BASE}/delete/${word.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
      showSuccess('Word deleted')
      loadWords()
    } catch { showError('Failed to delete word') }
  }

  const saveComment = async (word: VocabWord, comment: string) => {
    const updated = { ...word, comment }
    try {
      const response = await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (!response.ok) throw new Error('Save failed')
      showSuccess('Comment saved')
      loadWords()
    } catch { showError('Failed to save comment') }
  }

  const updateTense = (field: keyof TenseDetails, value: string) => {
    setFormWord(prev => ({ ...prev, tenseDetails: { ...(prev.tenseDetails || getEmptyTense()), [field]: value } }))
  }

  // Voice search
  const [isListening, setIsListening] = useState(false)

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { showError('Voice search not supported in this browser'); return }

    const recognition = new SpeechRecognition()
    recognition.lang = 'sv-SE'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setSearch(transcript)
    }

    recognition.start()
  }

  // Filtering
  const filteredWords = words.filter(w => {
    const matchesSearch = !search || w.word.toLowerCase().includes(search.toLowerCase()) || w.meaning.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !categoryFilter || w.category === categoryFilter
    const matchesBook = !bookFilter || w.book === bookFilter
    return matchesSearch && matchesCategory && matchesBook
  })

  const bookOptions = [...new Set(words.map(w => w.book).filter(Boolean))]
  const totalPages = Math.ceil(filteredWords.length / PAGE_SIZE) || 1
  const pagedWords = filteredWords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  useEffect(() => { setCurrentPage(1) }, [search, categoryFilter, bookFilter])

  const getCategoryDisplay = (cat: string) => CATEGORIES.find(c => c.value === cat)?.displayName || cat

  return (
    <div className="vocab-container">
      {/* TOAST */}
      {(errorMessage || successMessage) && (
        <div className="vocab-toast-overlay">
          <div className={`vocab-toast ${errorMessage ? 'vocab-toast-error' : 'vocab-toast-success'}`}>
            <span>{errorMessage || successMessage}</span>
            <button className="vocab-toast-close" onClick={clearMessages}>×</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="vocab-hero">
        <h1>🇸🇪 Swedish Vocabulary</h1>
        <div className="vocab-hero-stats">
          <span className="vocab-hero-stat">{words.length} words</span>
          <span className="vocab-hero-stat">{new Set(words.map(w => w.category)).size} categories</span>
        </div>
      </div>

      {/* ADD / EDIT FORM */}
      {showForm && (
        <section className="vocab-form-section">
          <div className="vocab-form-title-row">
            <h2>{isEditing ? '✏️ Edit Word' : '➕ New Word'}</h2>
          </div>

          <div className="vocab-form-main">
            <div className="vocab-form-row">
              <div className="vocab-field vocab-field-word">
                <label>Swedish *</label>
                <input type="text" className="vocab-input" placeholder="en fru" value={formWord.word} onChange={e => setFormWord({ ...formWord, word: e.target.value })} autoFocus />
              </div>
              <div className="vocab-field vocab-field-meaning">
                <label>Meaning *</label>
                <input type="text" className="vocab-input" placeholder="wife" value={formWord.meaning} onChange={e => setFormWord({ ...formWord, meaning: e.target.value })} />
              </div>
              <div className="vocab-field vocab-field-cat">
                <label>Category</label>
                <select className="vocab-input" value={formWord.category} onChange={e => setFormWord({ ...formWord, category: e.target.value })}>
                  {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.displayName}</option>)}
                </select>
              </div>
            </div>

            <div className="vocab-form-row vocab-form-row-article">
              <div className="vocab-article-group">
                <span className="vocab-article-label">Article:</span>
                <button className={`vocab-art-btn ${formWord.article === 'en' ? 'active en' : ''}`} onClick={() => setFormWord({ ...formWord, article: 'en' })}>En</button>
                <button className={`vocab-art-btn ${formWord.article === 'ett' ? 'active ett' : ''}`} onClick={() => setFormWord({ ...formWord, article: 'ett' })}>Ett</button>
                <button className={`vocab-art-btn ${formWord.article === '' ? 'active none' : ''}`} onClick={() => setFormWord({ ...formWord, article: '' })}>—</button>
              </div>
              <div className="vocab-form-buttons">
                <button className="vocab-btn-save" onClick={saveWord} disabled={isLoading}>{isEditing ? '✓ Update' : '✓ Save'}</button>
                <button className="vocab-btn-cancel" onClick={closeForm}>Cancel</button>
              </div>
            </div>

            <div className="vocab-form-row vocab-form-row-extra">
              <div className="vocab-field">
                <label>Comment</label>
                <input type="text" className="vocab-input" placeholder="Usage example..." value={formWord.comment} onChange={e => setFormWord({ ...formWord, comment: e.target.value })} />
              </div>
              <div className="vocab-field vocab-field-sm">
                <label>Book</label>
                <input type="text" className="vocab-input" placeholder="Book" list="book-options" value={formWord.book} onChange={e => setFormWord({ ...formWord, book: e.target.value })} />
                <datalist id="book-options">{bookOptions.map(b => <option key={b} value={b} />)}</datalist>
              </div>
              <div className="vocab-field vocab-field-xs">
                <label>Page</label>
                <input type="text" className="vocab-input" placeholder="pg" value={formWord.page} onChange={e => setFormWord({ ...formWord, page: e.target.value })} />
              </div>
            </div>

            <div className="vocab-tense-toggle">
              <button className="vocab-tense-btn" onClick={() => setShowTense(!showTense)}>
                {showTense ? '▼ Hide Tenses' : '▶ Tenses (optional)'}
              </button>
            </div>

            {showTense && (
              <div className="vocab-tense-grid">
                <div className="vocab-tense-card">
                  <span className="vocab-tense-label">Present</span>
                  <input type="text" className="vocab-input" placeholder="går" value={formWord.tenseDetails?.presentTense || ''} onChange={e => updateTense('presentTense', e.target.value)} />
                  <input type="text" className="vocab-input vocab-input-sm" placeholder="Jag går hem." value={formWord.tenseDetails?.presentExample || ''} onChange={e => updateTense('presentExample', e.target.value)} />
                </div>
                <div className="vocab-tense-card">
                  <span className="vocab-tense-label">Past</span>
                  <input type="text" className="vocab-input" placeholder="gick" value={formWord.tenseDetails?.pastTense || ''} onChange={e => updateTense('pastTense', e.target.value)} />
                  <input type="text" className="vocab-input vocab-input-sm" placeholder="Jag gick hem." value={formWord.tenseDetails?.pastExample || ''} onChange={e => updateTense('pastExample', e.target.value)} />
                </div>
                <div className="vocab-tense-card">
                  <span className="vocab-tense-label">Future</span>
                  <input type="text" className="vocab-input" placeholder="ska gå" value={formWord.tenseDetails?.futureTense || ''} onChange={e => updateTense('futureTense', e.target.value)} />
                  <input type="text" className="vocab-input vocab-input-sm" placeholder="Jag ska gå hem." value={formWord.tenseDetails?.futureExample || ''} onChange={e => updateTense('futureExample', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* WORD LIST */}
      {!showForm && (
        <section className="vocab-list-section">
          {/* Search & Filter Bar */}
          <div className="vocab-search-bar">
            <button className="vocab-btn-add" onClick={openAddForm}>+ New Word</button>
            <div className="vocab-search-input-wrap">
              <input type="text" className="vocab-search-input" placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} />
              <button className={`vocab-btn-mic ${isListening ? 'listening' : ''}`} onClick={startVoiceSearch} title="Voice search">
                🎤
              </button>
            </div>
            <select className="vocab-filter-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.displayName}</option>)}
            </select>
            <select className="vocab-filter-select" value={bookFilter} onChange={e => setBookFilter(e.target.value)}>
              <option value="">All Books</option>
              {bookOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            {(search || categoryFilter || bookFilter) && (
              <button className="vocab-btn-clear" onClick={() => { setSearch(''); setCategoryFilter(''); setBookFilter('') }}>✕</button>
            )}
          </div>

          {/* Results info */}
          <div className="vocab-results-info">
            <span>{filteredWords.length} word{filteredWords.length !== 1 ? 's' : ''}</span>
            {totalPages > 1 && <span className="vocab-page-info">Page {currentPage}/{totalPages}</span>}
          </div>

          {isLoading && <div className="vocab-loading">Loading...</div>}

          {filteredWords.length === 0 && !isLoading ? (
            <div className="vocab-empty-state">
              <p>No words found.</p>
              <button className="vocab-btn-add" onClick={openAddForm}>+ Add your first word</button>
            </div>
          ) : (
            <>
              {/* Word Cards */}
              <div className="vocab-word-list">
                {pagedWords.map((w, i) => (
                  <div key={w.id ?? i} className="vocab-word-card" onClick={() => setExpandedWord(expandedWord === w.id ? null : w.id)}>
                    <div className="vocab-word-card-main">
                      <div className="vocab-word-left">
                        {w.article && <span className={`vocab-art-tag ${w.article}`}>{w.article}</span>}
                        <span className="vocab-word-text">{w.word}</span>
                        <span className="vocab-word-dash">—</span>
                        <span className="vocab-word-meaning">{w.meaning}</span>
                      </div>
                      <div className="vocab-word-right">
                        {w.book && <span className="vocab-word-book">{w.book}{w.page ? ` p.${w.page}` : ''}</span>}
                        <span className="vocab-word-cat">{getCategoryDisplay(w.category)}</span>
                        <button className="vocab-btn-edit" onClick={e => { e.stopPropagation(); openEditForm(w) }}>Edit</button>
                        <button className="vocab-btn-del" onClick={e => { e.stopPropagation(); deleteWord(w) }}>✕</button>
                      </div>
                    </div>

                    {expandedWord === w.id && (
                      <div className="vocab-word-card-detail">
                        {w.comment && <div className="vocab-detail-comment"><strong>💬</strong> {w.comment}</div>}
                        {w.tenseDetails && (w.tenseDetails.presentTense || w.tenseDetails.pastTense || w.tenseDetails.futureTense) && (
                          <div className="vocab-detail-tenses">
                            {w.tenseDetails.presentTense && <span className="vocab-detail-tense"><em>Present:</em> {w.tenseDetails.presentTense}</span>}
                            {w.tenseDetails.pastTense && <span className="vocab-detail-tense"><em>Past:</em> {w.tenseDetails.pastTense}</span>}
                            {w.tenseDetails.futureTense && <span className="vocab-detail-tense"><em>Future:</em> {w.tenseDetails.futureTense}</span>}
                          </div>
                        )}
                        {!w.comment && !(w.tenseDetails?.presentTense || w.tenseDetails?.pastTense || w.tenseDetails?.futureTense) && (
                          <div className="vocab-detail-empty">No extra details.</div>
                        )}
                        <div className="vocab-detail-actions">
                          <button className="vocab-btn-comment" onClick={e => { e.stopPropagation(); const c = prompt('Edit comment:', w.comment || ''); if (c !== null) saveComment(w, c) }}>💬 Comment</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="vocab-pagination">
                  <button className="vocab-page-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>← Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button key={page} className={`vocab-page-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
                  ))}
                  <button className="vocab-page-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next →</button>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}

export default Vocabulary
