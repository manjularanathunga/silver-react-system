import { useState, useEffect, useCallback } from 'react'
import '../css/Fields.css'

interface FieldItem {
  id: number | null
  fieldName: string
  TravelType?: string
  description: string
  fileName: string
}

const API_BASE = '/api/fileds'

function Fields() {
  const [products, setProducts] = useState<FieldItem[]>([])
  const [item, setItem] = useState<FieldItem>(initItem())
  const [filter, setFilter] = useState('')
  const [xmlFilePath, setXmlFilePath] = useState('')

  const [isIdDisabled, setIsIdDisabled] = useState(true)
  const [isFieldDisabled, setIsFieldDisabled] = useState(true)
  const [isSaveDisabled, setIsSaveDisabled] = useState(true)

  function initItem(): FieldItem {
    return {
      id: null,
      fieldName: '',
      description: '',
      fileName: '',
    }
  }

  const loadData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/findAll`)
      const data: FieldItem[] = await response.json()
      const sorted = [...data].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
      setProducts(sorted)
      setIsIdDisabled(true)
      setIsFieldDisabled(true)
      setIsSaveDisabled(true)
    } catch (error) {
      console.error('Failed to load fields', error)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const addItem = () => {
    setItem(initItem())
    setIsIdDisabled(true)
    setIsFieldDisabled(false)
    setIsSaveDisabled(false)
  }

  const editItem = (selected: FieldItem) => {
    setItem({ ...selected })
    setIsIdDisabled(true)
    setIsFieldDisabled(false)
    setIsSaveDisabled(false)
  }

  const saveUpdate = async () => {
    try {
      await fetch(`${API_BASE}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      setItem(initItem())
      setIsIdDisabled(true)
      setIsFieldDisabled(true)
      setIsSaveDisabled(true)
      loadData()
    } catch (error) {
      console.error('Failed to save item', error)
    }
  }

  const removeItem = async (id: number | null) => {
    if (id === null) return
    try {
      await fetch(`${API_BASE}/delete/${id}`, { method: 'DELETE' })
      loadData()
    } catch (error) {
      console.error('Failed to remove item', error)
    }
  }

  const refresh = () => {
    loadData()
    setItem(initItem())
  }

  const updateFile = async () => {
    try {
      await fetch(`${API_BASE}/updateXmlFile?xmlFileName=${encodeURIComponent(xmlFilePath)}`)
    } catch (error) {
      console.error('Failed to update file', error)
    }
  }

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (!filter) return true
    const lowerFilter = filter.toLowerCase()
    return (
      (p.fieldName && p.fieldName.toLowerCase().includes(lowerFilter)) ||
      (p.TravelType && p.TravelType.toLowerCase().includes(lowerFilter)) ||
      (p.description && p.description.toLowerCase().includes(lowerFilter)) ||
      (p.fileName && p.fileName.toLowerCase().includes(lowerFilter))
    )
  })

  return (
    <div className="fields-container">
      <p className="fields-heading">XML Content update</p>

      <div className="fields-form">
        <input
          type="text"
          className="form-text"
          placeholder="ID"
          disabled={isIdDisabled}
          value={item.id ?? ''}
          onChange={(e) => setItem({ ...item, id: e.target.value ? Number(e.target.value) : null })}
        />
        <input
          type="text"
          className="form-text"
          placeholder="Field Name"
          disabled={isFieldDisabled}
          value={item.fieldName}
          onChange={(e) => setItem({ ...item, fieldName: e.target.value })}
        />
        <input
          type="text"
          className="form-text"
          placeholder="Description"
          disabled={isFieldDisabled}
          value={item.description}
          onChange={(e) => setItem({ ...item, description: e.target.value })}
        />
        <input
          type="text"
          className="form-text"
          placeholder="File Name"
          disabled={isFieldDisabled}
          value={item.fileName}
          onChange={(e) => setItem({ ...item, fileName: e.target.value })}
        />
      </div>

      <div className="fields-actions">
        <button className="btn btn-primary" onClick={addItem}>
          Add
        </button>
        <button className="btn btn-primary" onClick={saveUpdate} disabled={isSaveDisabled}>
          Save
        </button>
        <button className="btn btn-primary" onClick={refresh}>
          Refresh
        </button>
      </div>

      <hr className="divider-green" />

      <div className="xml-update-row">
        <input
          type="text"
          className="form-text xml-path-input"
          placeholder="XML file path"
          value={xmlFilePath}
          onChange={(e) => setXmlFilePath(e.target.value)}
        />
        <button className="btn btn-primary" onClick={updateFile}>
          updateFile
        </button>
      </div>

      <hr className="divider-green" />

      <input
        type="text"
        className="form-text filter-input"
        placeholder="Filter..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <hr className="divider-green" />

      <div className="table-wrapper">
        <table className="fields-table">
          <thead>
            <tr>
              <th>#</th>
              <th>fieldName</th>
              <th>TravelType</th>
              <th>description</th>
              <th>fileName</th>
              <th>&nbsp;</th>
              <th>&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((x, index) => (
              <tr key={x.id ?? index}>
                <td>{index + 1}</td>
                <td>{x.fieldName}</td>
                <td>{x.TravelType}</td>
                <td>{x.description}</td>
                <td>{x.fileName}</td>
                <td>
                  <button className="btn btn-primary btn-sm" onClick={() => editItem(x)}>
                    edit
                  </button>
                </td>
                <td>
                  <button className="btn btn-primary btn-sm" onClick={() => removeItem(x.id)}>
                    remove
                  </button>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Fields
