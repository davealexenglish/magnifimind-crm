import { useState, useEffect } from 'react'
import api from '../utils/api'

interface State {
  cmn_states_id: number
  name: string
  abbrev: string
}

interface Address {
  pdat_address_id?: number | string
  addr1: string
  addr2?: string
  city: string
  cmn_states_id?: number
  state_name?: string
  zip?: string
  zip_plus_4?: string
  country?: string
  active_flag?: string
}

interface AddressFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (address: Address) => void
  address: Address | null
  personId: number
}

function AddressFormModal({ isOpen, onClose, onSave, address }: AddressFormModalProps) {
  const [addr1, setAddr1] = useState('')
  const [addr2, setAddr2] = useState('')
  const [city, setCity] = useState('')
  const [stateId, setStateId] = useState<number | ''>('')
  const [zip, setZip] = useState('')
  const [zipPlus4, setZipPlus4] = useState('')
  const [country, setCountry] = useState('USA')
  const [states, setStates] = useState<State[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchStates()
      if (address) {
        setAddr1(address.addr1 || '')
        setAddr2(address.addr2 || '')
        setCity(address.city || '')
        setStateId(address.cmn_states_id || '')
        setZip(address.zip || '')
        setZipPlus4(address.zip_plus_4 || '')
        setCountry(address.country || 'USA')
      } else {
        setAddr1('')
        setAddr2('')
        setCity('')
        setStateId('')
        setZip('')
        setZipPlus4('')
        setCountry('USA')
      }
    }
  }, [isOpen, address])

  const fetchStates = async () => {
    try {
      const response = await api.get('/states')
      setStates(response.data || [])
    } catch (err) {
      console.error('Failed to fetch states:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addr1.trim() || !city.trim()) {
      setError('Address Line 1 and City are required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const addressData: Address = {
        addr1: addr1.trim(),
        addr2: addr2.trim() || undefined,
        city: city.trim(),
        cmn_states_id: stateId ? Number(stateId) : undefined,
        state_name: states.find(s => s.cmn_states_id === Number(stateId))?.name,
        zip: zip.trim() || undefined,
        zip_plus_4: zipPlus4.trim() || undefined,
        country: country.trim() || undefined
      }

      if (address?.pdat_address_id) {
        addressData.pdat_address_id = address.pdat_address_id
      }

      onSave(addressData)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save address')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

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
      zIndex: 10000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#213547' }}>
          {address ? 'Edit Address' : 'Add Address'}
        </h3>

        {error && (
          <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '15px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Address Line 1 *
            </label>
            <input
              type="text"
              value={addr1}
              onChange={(e) => setAddr1(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
              autoFocus
              required
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Address Line 2
            </label>
            <input
              type="text"
              value={addr2}
              onChange={(e) => setAddr2(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                City *
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                State
              </label>
              <select
                value={stateId}
                onChange={(e) => setStateId(e.target.value ? Number(e.target.value) : '')}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select...</option>
                {states.map((state) => (
                  <option key={state.cmn_states_id} value={state.cmn_states_id}>
                    {state.abbrev}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                ZIP Code
              </label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="12345"
                maxLength={5}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                ZIP+4
              </label>
              <input
                type="text"
                value={zipPlus4}
                onChange={(e) => setZipPlus4(e.target.value)}
                placeholder="6789"
                maxLength={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
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
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#646cff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddressFormModal
