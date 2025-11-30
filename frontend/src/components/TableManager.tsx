import { useState, useEffect, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { type AxiosError } from 'axios'
import type { TableManagerProps, GenericRecord } from '../types'

function TableManager({ title, apiEndpoint, columns, idField }: TableManagerProps) {
  const [records, setRecords] = useState<GenericRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<GenericRecord[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [editingRecord, setEditingRecord] = useState<string | number | null>(null)
  const [showAddForm, setShowAddForm] = useState<boolean>(false)
  const [formData, setFormData] = useState<GenericRecord>({})
  const [lookupData, setLookupData] = useState<{ [key: string]: GenericRecord[] }>({})
  const navigate = useNavigate()

  // Fetch records
  useEffect(() => {
    fetchRecords()
    fetchLookupData()
  }, [apiEndpoint])

  // Fetch lookup data for dropdowns
  const fetchLookupData = async () => {
    const lookupColumns = columns.filter(col => col.type === 'select' && col.lookupEndpoint)

    for (const col of lookupColumns) {
      if (!col.lookupEndpoint) continue

      try {
        const token = localStorage.getItem('token')
        const response = await axios.get<GenericRecord[]>(`/api/v1/${col.lookupEndpoint}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setLookupData(prev => ({ ...prev, [col.field]: response.data }))
      } catch (err) {
        console.error(`Failed to fetch lookup data for ${col.field}:`, err)
      }
    }
  }

  // Filter records when search term changes
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredRecords(records)
    } else {
      const filtered = records.filter(record => {
        return columns.some(col => {
          const value = record[col.field]
          return value && String(value).toLowerCase().includes(searchTerm.toLowerCase())
        })
      })
      setFilteredRecords(filtered)
    }
  }, [searchTerm, records, columns])

  const fetchRecords = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get<GenericRecord[]>(`/api/v1/${apiEndpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRecords(response.data)
      setFilteredRecords(response.data)
    } catch (err) {
      const error = err as AxiosError<{ error: string }>
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        navigate('/login')
      } else {
        setError(error.response?.data?.error || 'Failed to fetch records')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (record: GenericRecord) => {
    setEditingRecord(record[idField])
    setFormData({ ...record })
    setShowAddForm(false)
  }

  const handleAdd = () => {
    setEditingRecord(null)
    const initialData: GenericRecord = {}
    columns.forEach(col => {
      if (!col.readOnly) {
        initialData[col.field] = col.type === 'checkbox' ? false : ''
      }
    })
    setFormData(initialData)
    setShowAddForm(true)
  }

  const handleSave = async () => {
    setError('')
    try {
      const token = localStorage.getItem('token')
      if (editingRecord) {
        // Update existing record
        await axios.put(`/api/v1/${apiEndpoint}/${editingRecord}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        // Create new record
        await axios.post(`/api/v1/${apiEndpoint}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      setEditingRecord(null)
      setShowAddForm(false)
      setFormData({})
      fetchRecords()
    } catch (err) {
      const error = err as AxiosError<{ error: string }>
      setError(error.response?.data?.error || 'Failed to save record')
    }
  }

  const handleDelete = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this record?')) return

    setError('')
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`/api/v1/${apiEndpoint}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchRecords()
    } catch (err) {
      const error = err as AxiosError<{ error: string }>
      setError(error.response?.data?.error || 'Failed to delete record')
    }
  }

  const handleCancel = () => {
    setEditingRecord(null)
    setShowAddForm(false)
    setFormData({})
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const formatValue = (value: any, type?: string): string => {
    if (value === null || value === undefined) return ''
    if (type === 'date' && value) {
      return new Date(value).toLocaleString()
    }
    if (type === 'checkbox') {
      return value ? 'Yes' : 'No'
    }
    return String(value)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: '#646cff', color: 'white', padding: '1rem 2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                color: '#646cff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              ← Dashboard
            </button>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{title}</h1>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('token')
              navigate('/login')
              window.location.reload()
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'white',
              color: '#646cff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {error && (
          <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#d32f2f', borderRadius: '4px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Search and Add Controls */}
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '300px',
              padding: '0.75rem',
              fontSize: '1rem',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
          <button
            onClick={handleAdd}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#646cff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '1rem'
            }}
          >
            + Add New
          </button>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingRecord) && (
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ marginTop: 0, color: '#213547' }}>
              {editingRecord ? 'Edit Record' : 'Add New Record'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {columns.filter(col => !col.readOnly).map(col => (
                <div key={col.field}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#213547' }}>
                    {col.label}
                  </label>
                  {col.type === 'textarea' ? (
                    <textarea
                      value={formData[col.field] || ''}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleInputChange(col.field, e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                    />
                  ) : col.type === 'checkbox' ? (
                    <input
                      type="checkbox"
                      checked={formData[col.field] || false}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange(col.field, e.target.checked)}
                      style={{ width: '20px', height: '20px' }}
                    />
                  ) : col.type === 'select' ? (
                    <select
                      value={formData[col.field] || ''}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => handleInputChange(col.field, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                    >
                      <option value="">Select {col.label}</option>
                      {lookupData[col.field]?.map(option => (
                        <option
                          key={option[col.lookupValue || 'id']}
                          value={option[col.lookupValue || 'id']}
                        >
                          {option[col.lookupLabel || 'name']}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={col.type || 'text'}
                      value={formData[col.field] || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange(col.field, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleSave}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#646cff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#ccc',
                  color: '#213547',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Records Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#646cff' }}>
            Loading...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            No records found
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                  {columns.filter(col => col.showInTable !== false).map(col => (
                    <th key={col.field} style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#213547' }}>
                      {col.label}
                    </th>
                  ))}
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: '#213547' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record, idx) => (
                  <tr key={record[idField] || idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    {columns.filter(col => col.showInTable !== false).map(col => (
                      <td key={col.field} style={{ padding: '1rem', color: '#213547' }}>
                        {formatValue(record[col.field], col.type)}
                      </td>
                    ))}
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleEdit(record)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#646cff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginRight: '0.5rem'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(record[idField])}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#d32f2f',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
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
      </main>
    </div>
  )
}

export default TableManager
