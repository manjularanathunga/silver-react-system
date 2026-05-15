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
    tenseDetails: getEmptyTense(),
  }
}

function Vocabulary() {
  const [words, setWords] = useState<VocabWord[]>([])
  const [formWord, setFormWord] = useState<VocabWord>(getEmptyWord())
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const clearMessages = () => {
    setSuccessMessage('')
    setErrorMessage('')
  }

  const loadWords = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/list`)
      if (!response.ok) throw new Error('API error')
      const data = await response.json()
      setWords(data.data || data || [])
    } catch {
      // API not available - show empty list without error blocking the page
      setWords([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWords()
  }, [loadWords])

  const openAddForm = () => {
    setFormWord(getEmptyWord())
    setIsEditing(false)
    setShowForm(true)
    clearMessages()
  }

  const openEditForm = (word: VocabWord) => {
    setFormWord({
      ...word,
      tenseDetails: word.tenseDetails || getEmptyTense(),
    })
    setIsEditing(true)
    setShowForm(true)
    clearMessages()
  }

  const closeForm = () => {
    setShowForm(false)
    setFormWord(getEmptyWord())
    clearMessages()
  }

  const saveWord = async () => {
    clearMessages()

    if (!formWord.word.trim()) {
      setErrorMessage('Swedish word is required')
      return
    }
    if (!formWord.meaning.trim()) {
      setErrorMessage('Meaning is required')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formWord),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Save failed')
      setSuccessMessage(isEditing ? 'Word updated successfully' : 'Word saved successfully')
      setShowForm(false)
      setFormWord(getEmptyWord())
      loadWords()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save word')
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
      setSuccessMessage('Word deleted successfully')
      loadWords()
    } catch {
      setErrorMessage('Failed to delete word')
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
    return matchesSearch && matchesCategory
  })

  const getCategoryDisplay = (cat: string) => {
    const found = CATEGORIES.find((c) => c.value === cat)
    return found ? found.displayName : cat
  }

  return (
    <div className="vocab-container">
      {/* HEADER */}
      <div className="vocab-hero">
        <div>
          <h1>Swedish Vocabulary Manager</h1>
          <p className="vocab-subtitle">
            Manage Swedish words, meanings, usage comments, categories, and tense details.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAddForm}>
          + Add New Word
        </button>
      </div>

      {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      {/* ADD / EDIT FORM */}
      {showForm && (
        <section className="card vocab-form-section">
          <div className="vocab-form-header">
            <h2>{isEditing ? 'Edit Swedish Word' : 'Add Swedish Word'}</h2>
            <p>Add meaning, category, usage comment, and tense examples.</p>
          </div>

          <div className="vocab-form-grid-3">
            <div className="form-group">
              <label>Swedish Word</label>
              <input
                type="text"
                className="form-control"
                placeholder="Example: en fru"
                value={formWord.word}
                onChange={(e) => setFormWord({ ...formWord, word: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Meaning / Translation</label>
              <input
                type="text"
                className="form-control"
                placeholder="Example: wife"
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

          <div className="form-group">
            <label>Comment / Usage</label>
            <textarea
              className="form-control"
              rows={4}
              placeholder="Example: Hon är min fru."
              value={formWord.comment}
              onChange={(e) => setFormWord({ ...formWord, comment: e.target.value })}
            />
          </div>

          <h3 className="tense-heading">Tense Details</h3>

          <div className="tense-grid">
            <div className="tense-card">
              <h4>Present Tense</h4>
              <div className="form-group">
                <label>Current / Present</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Example: går"
                  value={formWord.tenseDetails?.presentTense || ''}
                  onChange={(e) => updateTense('presentTense', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Present Example</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Example: Jag går hem."
                  value={formWord.tenseDetails?.presentExample || ''}
                  onChange={(e) => updateTense('presentExample', e.target.value)}
                />
              </div>
            </div>

            <div className="tense-card">
              <h4>Past Tense</h4>
              <div className="form-group">
                <label>Past</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Example: gick"
                  value={formWord.tenseDetails?.pastTense || ''}
                  onChange={(e) => updateTense('pastTense', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Past Example</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Example: Jag gick hem."
                  value={formWord.tenseDetails?.pastExample || ''}
                  onChange={(e) => updateTense('pastExample', e.target.value)}
                />
              </div>
            </div>

            <div className="tense-card">
              <h4>Future Tense</h4>
              <div className="form-group">
                <label>Future</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Example: ska gå"
                  value={formWord.tenseDetails?.futureTense || ''}
                  onChange={(e) => updateTense('futureTense', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Future Example</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Example: Jag ska gå hem."
                  value={formWord.tenseDetails?.futureExample || ''}
                  onChange={(e) => updateTense('futureExample', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="vocab-form-actions">
            <button className="btn btn-primary" onClick={saveWord} disabled={isLoading}>
              {isEditing ? 'Update Word' : 'Save Word'}
            </button>
            <button className="btn btn-secondary" onClick={closeForm}>
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* FILTER */}
      <section className="card vocab-filter-section">
        <div className="vocab-filter-row">
          <div className="form-group">
            <label>Search</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search word or meaning"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Category</label>
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
          </div>
          <div className="vocab-filter-actions">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSearch('')
                setCategoryFilter('')
              }}
            >
              Reset
            </button>
            <button className="btn btn-secondary" onClick={loadWords}>
              Reload
            </button>
          </div>
        </div>
      </section>

      {/* WORD LIST */}
      <section className="card vocab-list-section">
        <div className="vocab-list-header">
          <h2>Vocabulary List</h2>
          <span className="vocab-count">{filteredWords.length} word(s)</span>
        </div>

        {isLoading && (
          <div className="loading-text">
            <strong>Loading...</strong>
          </div>
        )}

        {filteredWords.length === 0 && !isLoading ? (
          <div className="vocab-empty">
            <h3>No words found</h3>
            <p>Add your first Swedish word to start building your vocabulary.</p>
            <button className="btn btn-primary" onClick={openAddForm}>
              Add Word
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="vocab-table">
              <thead>
                <tr>
                  <th>Swedish Word</th>
                  <th>Meaning</th>
                  <th>Comment / Usage</th>
                  <th>Category</th>
                  <th>Present</th>
                  <th>Past</th>
                  <th>Future</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWords.map((w, index) => (
                  <tr key={w.id ?? index}>
                    <td className="vocab-word-cell">{w.word}</td>
                    <td>{w.meaning}</td>
                    <td className="vocab-comment-cell">{w.comment}</td>
                    <td>
                      <span className="vocab-badge">{getCategoryDisplay(w.category)}</span>
                    </td>
                    <td className="vocab-tense-cell">
                      {w.tenseDetails?.presentTense && (
                        <>
                          <strong>{w.tenseDetails.presentTense}</strong>
                          {w.tenseDetails.presentExample && (
                            <small>{w.tenseDetails.presentExample}</small>
                          )}
                        </>
                      )}
                    </td>
                    <td className="vocab-tense-cell">
                      {w.tenseDetails?.pastTense && (
                        <>
                          <strong>{w.tenseDetails.pastTense}</strong>
                          {w.tenseDetails.pastExample && (
                            <small>{w.tenseDetails.pastExample}</small>
                          )}
                        </>
                      )}
                    </td>
                    <td className="vocab-tense-cell">
                      {w.tenseDetails?.futureTense && (
                        <>
                          <strong>{w.tenseDetails.futureTense}</strong>
                          {w.tenseDetails.futureExample && (
                            <small>{w.tenseDetails.futureExample}</small>
                          )}
                        </>
                      )}
                    </td>
                    <td className="vocab-actions">
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
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default Vocabulary
