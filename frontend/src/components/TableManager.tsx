import { useState, useEffect, useMemo, type ChangeEvent } from 'react'
import type { AxiosError } from 'axios'
import api from '../utils/api'
import type { TableManagerProps, GenericRecord } from '../types'
import ConfirmationModal from './ConfirmationModal'
import PersonPicker from './PersonPicker'

function TableManager({ title, apiEndpoint, columns, idField, hardDeleteEndpoint }: TableManagerProps) {
  const [records, setRecords] = useState<GenericRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<GenericRecord[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [editingRecord, setEditingRecord] = useState<string | number | null>(null)
  const [showAddForm, setShowAddForm] = useState<boolean>(false)
  const [formData, setFormData] = useState<GenericRecord>({})
  const [lookupData, setLookupData] = useState<{ [key: string]: GenericRecord[] }>({})
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set())
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(20)
  const [sortBy, setSortBy] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; recordToDelete: GenericRecord | null; isBulk: boolean }>({
    isOpen: false,
    recordToDelete: null,
    isBulk: false
  })
  const [hardDeleteModal, setHardDeleteModal] = useState<{ isOpen: boolean }>({ isOpen: false })
  const [personPickerField, setPersonPickerField] = useState<string | null>(null)

  // Fetch records
  useEffect(() => {
    fetchRecords()
    fetchLookupData()
  }, [apiEndpoint])

  // Handle edit mode - populate form when editingRecord changes
  useEffect(() => {
    if (editingRecord && records.length > 0) {
      const recordToEdit = records.find(r => r[idField] === editingRecord)
      if (recordToEdit) {
        const convertedData: GenericRecord = { ...recordToEdit }
        columns.forEach(col => {
          if (col.type === 'checkbox' && typeof recordToEdit[col.field] === 'string') {
            convertedData[col.field] = recordToEdit[col.field] === 'Y'
          }
        })
        setFormData(convertedData)
      }
    }
  }, [editingRecord, records, idField, columns])

  // Fetch lookup data for dropdowns
  const fetchLookupData = async () => {
    const lookupColumns = columns.filter(col => col.type === 'select' && col.lookupEndpoint)

    for (const col of lookupColumns) {
      if (!col.lookupEndpoint) continue

      try {
        const response = await api.get<GenericRecord[]>(`/${col.lookupEndpoint}`)
        setLookupData(prev => ({ ...prev, [col.field]: response.data }))
      } catch (err) {
        console.error(`Failed to fetch lookup data for ${col.field}:`, err)
      }
    }
  }

  // Filter and sort records
  useEffect(() => {
    let result = records

    // Apply search filter
    if (searchTerm !== '') {
      result = result.filter(record => {
        return columns.some(col => {
          const value = record[col.field]
          return value && String(value).toLowerCase().includes(searchTerm.toLowerCase())
        })
      })
    }

    // Apply sorting
    if (sortBy) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortBy]
        const bVal = b[sortBy]

        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1

        const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    setFilteredRecords(result)
    setCurrentPage(1) // Reset to first page when filters change
  }, [searchTerm, records, columns, sortBy, sortDirection])

  // Reset to first page when items per page changes
  useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage])

  // Calculate paginated records
  const paginatedRecords = useMemo(() => {
    if (itemsPerPage === 'all') {
      return filteredRecords
    }
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredRecords, currentPage, itemsPerPage])

  const totalPages = useMemo(() => {
    if (itemsPerPage === 'all') return 1
    return Math.ceil(filteredRecords.length / itemsPerPage)
  }, [filteredRecords.length, itemsPerPage])

  const fetchRecords = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get<GenericRecord[]>(`/${apiEndpoint}`)
      setRecords(response.data)
      setFilteredRecords(response.data)
    } catch (err) {
      const error = err as AxiosError<{ error: string }>
      // 401 is handled by api interceptor
      setError(error.response?.data?.error || 'Failed to fetch records')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (record: GenericRecord) => {
    setEditingRecord(record[idField])
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
      // Convert boolean to 'Y'/'N' for checkbox fields before sending
      const dataToSend: GenericRecord = { ...formData }
      columns.forEach(col => {
        if (col.type === 'checkbox' && typeof formData[col.field] === 'boolean') {
          dataToSend[col.field] = formData[col.field] ? 'Y' : 'N'
        }
      })

      if (editingRecord) {
        // Update existing record
        await api.put(`/${apiEndpoint}/${editingRecord}`, dataToSend)
      } else {
        // Create new record
        await api.post(`/${apiEndpoint}`, dataToSend)
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

  const handleDelete = (record: GenericRecord) => {
    setDeleteModal({
      isOpen: true,
      recordToDelete: record,
      isBulk: false
    })
  }

  const handleBulkDeleteClick = () => {
    if (selectedRows.size === 0) return
    setDeleteModal({
      isOpen: true,
      recordToDelete: null,
      isBulk: true
    })
  }

  const handleHardDeleteClick = () => {
    if (selectedRows.size === 0) return
    setHardDeleteModal({ isOpen: true })
  }

  const confirmHardDelete = async () => {
    if (!hardDeleteEndpoint || selectedRows.size === 0) return
    setError('')

    try {
      const ids = Array.from(selectedRows).map(id => typeof id === 'string' ? parseInt(id, 10) : id)
      await api.post(`/${hardDeleteEndpoint}`, { ids })
      setSelectedRows(new Set())
      setHardDeleteModal({ isOpen: false })
      fetchRecords()
    } catch (err) {
      const error = err as AxiosError<{ error: string }>
      setError(error.response?.data?.error || 'Failed to permanently delete record(s)')
      setHardDeleteModal({ isOpen: false })
    }
  }

  const confirmDelete = async () => {
    setError('')

    try {
      if (deleteModal.isBulk) {
        // Bulk delete
        const deletePromises = Array.from(selectedRows).map(id =>
          api.delete(`/${apiEndpoint}/${id}`)
        )
        await Promise.all(deletePromises)
        setSelectedRows(new Set())
      } else if (deleteModal.recordToDelete) {
        // Single delete
        const id = deleteModal.recordToDelete[idField]
        await api.delete(`/${apiEndpoint}/${id}`)
      }
      fetchRecords()
    } catch (err) {
      const error = err as AxiosError<{ error: string }>
      setError(error.response?.data?.error || 'Failed to delete record(s)')
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
      // Handle both boolean and 'Y'/'N' format
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No'
      }
      return value === 'Y' ? 'Yes' : 'No'
    }
    return String(value)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedRecords.map(r => r[idField]))
      setSelectedRows(allIds)
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleSelectRow = (id: string | number, checked: boolean) => {
    const newSelected = new Set(selectedRows)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedRows(newSelected)
  }

  const visibleColumns = columns.filter(col => col.showInTable !== false)
  const sortableColumns = columns.filter(col => col.showInTable !== false)

  // Generate delete confirmation message
  const getDeleteMessage = () => {
    if (deleteModal.isBulk) {
      return (
        <div>
          <p>You are about to delete <strong>{selectedRows.size}</strong> record(s).</p>
          <p>This action cannot be undone.</p>
        </div>
      )
    } else if (deleteModal.recordToDelete) {
      const record = deleteModal.recordToDelete
      const displayFields = visibleColumns.slice(0, 3).map(col => ({
        label: col.label,
        value: formatValue(record[col.field], col.type)
      }))
      return (
        <div>
          <p>You are about to delete the following record:</p>
          <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px', margin: '1rem 0' }}>
            {displayFields.map((field, idx) => (
              <div key={idx} style={{ marginBottom: '0.5rem' }}>
                <strong>{field.label}:</strong> {field.value || '(empty)'}
              </div>
            ))}
          </div>
          <p>This action cannot be undone.</p>
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 1.5rem 0', fontSize: '1.75rem', color: '#213547' }}>{title}</h1>
        {error && (
          <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#d32f2f', borderRadius: '4px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Search, Sort, and Add Controls */}
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '0.75rem',
              fontSize: '1rem',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: '#213547' }}>Sort by:</label>
            <select
              value={sortBy}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value)}
              style={{
                padding: '0.75rem',
                fontSize: '1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                minWidth: '150px'
              }}
            >
              <option value="">None</option>
              {sortableColumns.map(col => (
                <option key={col.field} value={col.field}>{col.label}</option>
              ))}
            </select>
            {sortBy && (
              <button
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
                title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortDirection === 'asc' ? '↑' : '↓'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: '#213547' }}>Per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                const value = e.target.value
                setItemsPerPage(value === 'all' ? 'all' : Number(value))
              }}
              style={{
                padding: '0.75rem',
                fontSize: '1rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
              <option value="all">All</option>
            </select>
          </div>

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

          <button
            onClick={handleBulkDeleteClick}
            disabled={selectedRows.size === 0}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: selectedRows.size === 0 ? '#ccc' : '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: selectedRows.size === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '1rem',
              opacity: selectedRows.size === 0 ? 0.6 : 1
            }}
          >
            🗑️ Delete Selected ({selectedRows.size})
          </button>

          {hardDeleteEndpoint && (
            <button
              onClick={handleHardDeleteClick}
              disabled={selectedRows.size === 0}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: selectedRows.size === 0 ? '#ccc' : '#7f1d1d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRows.size === 0 ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                fontSize: '1rem',
                opacity: selectedRows.size === 0 ? 0.6 : 1
              }}
              title="Permanently delete selected records and all related data (addresses, emails, phones, notes, links)"
            >
              ☠️ Hard Delete ({selectedRows.size})
            </button>
          )}
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
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {columns.filter(col => !col.readOnly).map(col => (
                  <tr key={col.field}>
                    <td style={{
                      padding: '0.35rem',
                      fontWeight: '500',
                      color: '#213547',
                      verticalAlign: 'top',
                      width: '200px',
                      textAlign: 'right',
                      paddingRight: '0.75rem'
                    }}>
                      {col.label}:
                    </td>
                    <td style={{ padding: '0.35rem' }}>
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
                          checked={typeof formData[col.field] === 'boolean' ? formData[col.field] : formData[col.field] === 'Y'}
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
                      ) : col.type === 'person-picker' ? (
                        <button
                          type="button"
                          onClick={() => setPersonPickerField(col.field)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            backgroundColor: formData[col.field] ? '#28a745' : '#646cff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          {formData[col.field] ? `✓ ${formData[`${col.field}_display_name`] || formData[col.field]}` : '👤 Select Person'}
                        </button>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#213547', fontSize: '0.9rem', width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={paginatedRecords.length > 0 && paginatedRecords.every(r => selectedRows.has(r[idField]))}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    {visibleColumns.map(col => (
                      <th key={col.field} style={{ padding: '0.4rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#213547', fontSize: '0.9rem' }}>
                        {col.label}
                      </th>
                    ))}
                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#213547', fontSize: '0.9rem', width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((record, idx) => (
                    <tr key={record[idField] || idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '0.35rem 0.5rem', textAlign: 'left' }}>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(record[idField])}
                          onChange={(e) => handleSelectRow(record[idField], e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      {visibleColumns.map(col => (
                        <td key={col.field} style={{ padding: '0.35rem 0.5rem', textAlign: 'left', color: '#213547', fontSize: '0.9rem' }}>
                          {formatValue(record[col.field], col.type)}
                        </td>
                      ))}
                      <td style={{ padding: '0.35rem 0.5rem', textAlign: 'left' }}>
                        <button
                          onClick={() => handleEdit(record)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '18px',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            borderRadius: '6px',
                            transition: 'background-color 0.2s'
                          }}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(record)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '18px',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            borderRadius: '6px',
                            transition: 'background-color 0.2s',
                            color: '#ef4444'
                          }}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {itemsPerPage !== 'all' && totalPages > 1 && (
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: currentPage === 1 ? '#ccc' : '#646cff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  ← Prev
                </button>

                <span style={{ padding: '0.5rem 1rem', color: '#213547', fontWeight: '500' }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: currentPage === totalPages ? '#ccc' : '#646cff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Next →
                </button>
              </div>
            )}

            {/* Records count */}
            <div style={{ marginTop: '1rem', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
              Showing {paginatedRecords.length} of {filteredRecords.length} records
              {filteredRecords.length !== records.length && ` (filtered from ${records.length} total)`}
            </div>
          </>
        )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.isBulk ? 'Delete Multiple Records' : 'Delete Record'}
        message={getDeleteMessage()}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, recordToDelete: null, isBulk: false })}
        isDangerous={true}
      />

      {/* Person Picker Modal */}
      {personPickerField && (
        <PersonPicker
          onSelect={(person: any) => {
            handleInputChange(personPickerField, person.pdat_person_id)
            // Store person name in a separate field for display
            handleInputChange(`${personPickerField}_display_name`, `${person.fname} ${person.lname}`)
            setPersonPickerField(null)
          }}
          onCancel={() => setPersonPickerField(null)}
          selectedPersonId={formData[personPickerField]}
        />
      )}

      {/* Hard Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={hardDeleteModal.isOpen}
        title="⚠️ PERMANENT DELETE"
        message={
          <div>
            <p style={{ color: '#7f1d1d', fontWeight: 'bold', fontSize: '1.1rem' }}>
              WARNING: This action is IRREVERSIBLE!
            </p>
            <p>You are about to <strong>permanently delete {selectedRows.size} record(s)</strong>.</p>
            <p>This will also delete ALL related data:</p>
            <ul style={{ textAlign: 'left', marginLeft: '1rem' }}>
              <li>Addresses</li>
              <li>Email addresses</li>
              <li>Phone numbers</li>
              <li>Notes</li>
              <li>Links</li>
              <li>Calendar associations</li>
            </ul>
            <p style={{ marginTop: '1rem', fontWeight: 'bold', color: '#7f1d1d' }}>
              This data CANNOT be recovered!
            </p>
          </div>
        }
        confirmText="PERMANENTLY DELETE"
        cancelText="Cancel"
        onConfirm={confirmHardDelete}
        onCancel={() => setHardDeleteModal({ isOpen: false })}
        isDangerous={true}
      />
    </div>
  )
}

export default TableManager
