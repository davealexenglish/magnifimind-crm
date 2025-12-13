// @ts-nocheck
import { useState, useEffect } from 'react'
import { apiFetch } from '../utils/api'

interface Person {
  pdat_person_id: number
  fname: string
  lname: string
  business_flag: boolean
}

interface PersonPickerProps {
  onSelect: (person: Person) => void
  onCancel: () => void
  selectedPersonId?: number
}

function PersonPicker({ onSelect, onCancel, selectedPersonId }: PersonPickerProps) {
  const [searchResults, setSearchResults] = useState<Person[]>([])
  const [firstNameSearch, setFirstNameSearch] = useState('')
  const [lastNameSearch, setLastNameSearch] = useState('')
  const [showBusinessOnly, setShowBusinessOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    setHasSearched(true)
    setLoading(true)
    setError(null)

    try {
      // Build query parameters for database-level filtering
      const params = new URLSearchParams()

      if (firstNameSearch.trim() !== '') {
        params.append('fname', firstNameSearch.trim())
      }

      if (lastNameSearch.trim() !== '') {
        params.append('lname', lastNameSearch.trim())
      }

      if (showBusinessOnly) {
        params.append('business_flag', 'true')
      }

      const queryString = params.toString()
      const url = queryString ? `/api/v1/people?${queryString}` : '/api/v1/people'

      const response = await apiFetch(url)

      if (!response.ok) throw new Error('Failed to search people')
      const data = await response.json()

      // Handle both response formats: { people: [...] } or direct array
      let results = []
      if (Array.isArray(data)) {
        results = data
      } else if (data.people && Array.isArray(data.people)) {
        results = data.people
      } else if (data.data && Array.isArray(data.data)) {
        results = data.data
      }

      console.log('PersonPicker API response:', data)
      console.log('PersonPicker parsed results:', results)
      setSearchResults(results)
    } catch (err) {
      setError('Failed to search people: ' + err.message)
      setSearchResults([])
      console.error('PersonPicker search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (person: Person) => {
    onSelect(person)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: '#213547' }}>Select Person</h2>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>

        {/* Search Fields */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>First Name:</label>
              <input
                type="text"
                placeholder="Enter first name..."
                value={firstNameSearch}
                onChange={(e) => setFirstNameSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                style={{
                  padding: '10px',
                  fontSize: '16px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Last Name:</label>
              <input
                type="text"
                placeholder="Enter last name..."
                value={lastNameSearch}
                onChange={(e) => setLastNameSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                style={{
                  padding: '10px',
                  fontSize: '16px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Business Filter and Search Button */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showBusinessOnly}
                onChange={(e) => setShowBusinessOnly(e.target.checked)}
              />
              <span>Businesses only</span>
            </label>
            <button
              onClick={handleSearch}
              style={{
                padding: '10px 20px',
                backgroundColor: '#646cff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                marginLeft: 'auto'
              }}
            >
              🔍 Search
            </button>
          </div>
        </div>

        {/* Error/Loading */}
        {error && (
          <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '10px' }}>
            {error}
          </div>
        )}
        {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Loading people...</div>}

        {/* People List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: '#f9f9f9'
        }}>
          {searchResults.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
              {hasSearched ? 'No people found matching your search' : 'Click Search to find people'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>First Name</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Last Name</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((person) => (
                  <tr
                    key={person.pdat_person_id}
                    style={{
                      borderBottom: '1px solid #ddd',
                      backgroundColor: person.pdat_person_id === selectedPersonId ? '#e7f3ff' : 'white',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleSelect(person)}
                  >
                    <td style={{ padding: '10px' }}>{person.fname}</td>
                    <td style={{ padding: '10px' }}>{person.lname}</td>
                    <td style={{ padding: '10px' }}>
                      {person.business_flag ? '🏢 Business' : '👤 Person'}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelect(person)
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#646cff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Results Count */}
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
          {hasSearched ? `Found ${searchResults.length} ${searchResults.length === 1 ? 'person' : 'people'}` : 'Enter search criteria and click Search'}
        </div>
      </div>
    </div>
  )
}

export default PersonPicker
