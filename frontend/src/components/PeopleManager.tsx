import { useState, useCallback } from 'react'
import api from '../utils/api'
import PersonSearchModal from './PersonSearchModal'
import PersonEditModal from './PersonEditModal'

interface Person {
  pdat_person_id: number
  fname: string
  lname: string
  full_name: string
  business_flag: string
  active_flag: string
}

interface Email {
  email_addr: string
  email_type_name: string
  active_flag: string
}

interface Phone {
  phone_num: string
  phone_type_name: string
  active_flag: string
}

interface PersonWithContacts extends Person {
  emails: Email[]
  phones: Phone[]
}

interface SearchParams {
  name: string
  showInactive: boolean
}

function PeopleManager() {
  const [people, setPeople] = useState<PersonWithContacts[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null)

  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [personToDelete, setPersonToDelete] = useState<PersonWithContacts | null>(null)

  const fetchPeopleWithContacts = useCallback(async (params: SearchParams) => {
    setLoading(true)
    setError(null)
    setHasSearched(true)
    setSearchParams(params)

    try {
      // Fetch people based on search params
      const queryParams = new URLSearchParams()
      if (params.name) {
        queryParams.append('name', params.name)
      }
      if (params.showInactive) {
        queryParams.append('show_inactive', 'true')
      }

      const peopleResponse = await api.get(`/people?${queryParams.toString()}`)
      const peopleList: Person[] = peopleResponse.data || []

      // For each person, fetch their full data to get emails and phones
      const peopleWithContacts: PersonWithContacts[] = await Promise.all(
        peopleList.map(async (person) => {
          try {
            const fullResponse = await api.get(`/people/${person.pdat_person_id}/full?show_inactive=${params.showInactive}`)
            return {
              ...person,
              emails: fullResponse.data.emails || [],
              phones: fullResponse.data.phones || []
            }
          } catch {
            return {
              ...person,
              emails: [],
              phones: []
            }
          }
        })
      )

      setPeople(peopleWithContacts)
    } catch (err: any) {
      setError('Failed to search people: ' + (err.response?.data?.error || err.message))
      setPeople([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearch = (params: SearchParams) => {
    fetchPeopleWithContacts(params)
  }

  const handleAddPerson = () => {
    setEditingPersonId(null)
    setEditModalOpen(true)
  }

  const handleEditPerson = (personId: number) => {
    setEditingPersonId(personId)
    setEditModalOpen(true)
  }

  const handleDeleteClick = (person: PersonWithContacts) => {
    setPersonToDelete(person)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!personToDelete) return

    try {
      await api.delete(`/people/${personToDelete.pdat_person_id}/hard`)
      // Refresh the list
      if (searchParams) {
        fetchPeopleWithContacts(searchParams)
      }
    } catch (err: any) {
      setError('Failed to delete person: ' + (err.response?.data?.error || err.message))
    } finally {
      setDeleteConfirmOpen(false)
      setPersonToDelete(null)
    }
  }

  const handleSaveComplete = () => {
    // Refresh the list after save
    if (searchParams) {
      fetchPeopleWithContacts(searchParams)
    }
  }

  const renderInactiveStyle = (active_flag: string) => {
    if (active_flag === 'N') {
      return { color: '#999' }
    }
    return {}
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, color: '#213547' }}>People</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setSearchModalOpen(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#646cff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Search
          </button>
          <button
            onClick={handleAddPerson}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            + Add Person
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Loading...
        </div>
      ) : !hasSearched ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#666', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔍</div>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>Search for people to get started</div>
          <div style={{ color: '#999' }}>Click the Search button to find people in your contacts</div>
        </div>
      ) : people.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#666', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📭</div>
          <div style={{ fontSize: '18px' }}>No people found</div>
          <div style={{ color: '#999', marginTop: '10px' }}>Try a different search or add a new person</div>
        </div>
      ) : (
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '12px 15px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Last Name</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>First Name</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Emails</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Phone Numbers</th>
                <th style={{ padding: '12px 15px', textAlign: 'center', borderBottom: '2px solid #ddd', width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr
                  key={person.pdat_person_id}
                  style={{
                    borderBottom: '1px solid #eee',
                    ...renderInactiveStyle(person.active_flag)
                  }}
                >
                  <td style={{ padding: '12px 15px', verticalAlign: 'top' }}>
                    <span style={{ fontWeight: 'bold' }}>{person.lname}</span>
                    {person.business_flag === 'Y' && <span style={{ marginLeft: '5px', color: '#666' }}>🏢</span>}
                  </td>
                  <td style={{ padding: '12px 15px', verticalAlign: 'top' }}>{person.fname}</td>
                  <td style={{ padding: '12px 15px', verticalAlign: 'top' }}>
                    {person.emails.length === 0 ? (
                      <span style={{ color: '#999' }}>-</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {person.emails.map((email, idx) => (
                          <div key={idx} style={{
                            fontSize: '13px',
                            ...renderInactiveStyle(email.active_flag)
                          }}>
                            {email.email_addr}
                            <span style={{ color: '#999', marginLeft: '5px', fontSize: '11px' }}>
                              ({email.email_type_name})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 15px', verticalAlign: 'top' }}>
                    {person.phones.length === 0 ? (
                      <span style={{ color: '#999' }}>-</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {person.phones.map((phone, idx) => (
                          <div key={idx} style={{
                            fontSize: '13px',
                            ...renderInactiveStyle(phone.active_flag)
                          }}>
                            {phone.phone_num}
                            <span style={{ color: '#999', marginLeft: '5px', fontSize: '11px' }}>
                              ({phone.phone_type_name})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 15px', textAlign: 'center', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEditPerson(person.pdat_person_id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '18px',
                          padding: '5px'
                        }}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteClick(person)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '18px',
                          padding: '5px'
                        }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Search Results Count */}
      {hasSearched && !loading && (
        <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          Found {people.length} {people.length === 1 ? 'person' : 'people'}
          {searchParams?.showInactive && ' (including inactive)'}
        </div>
      )}

      {/* Search Modal */}
      <PersonSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSearch={handleSearch}
        initialParams={searchParams || undefined}
      />

      {/* Edit Modal */}
      <PersonEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveComplete}
        personId={editingPersonId}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && personToDelete && (
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
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            width: '90%',
            maxWidth: '400px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#dc3545' }}>Confirm Delete</h3>
            <p style={{ marginBottom: '20px' }}>
              Are you sure you want to permanently delete <strong>{personToDelete.fname} {personToDelete.lname}</strong>?
            </p>
            <p style={{ marginBottom: '20px', color: '#dc3545', fontSize: '14px' }}>
              This will also delete all associated emails, phone numbers, addresses, links, and notes. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false)
                  setPersonToDelete(null)
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PeopleManager
