import { useState, useEffect } from 'react'
import api from '../utils/api'

interface PhoneType {
  pdat_phone_type_id: number
  name: string
}

interface Phone {
  pdat_pers_phone_id?: number | string
  phone_num: string
  phone_ext?: string
  country_code?: string
  pdat_phone_type_id: number
  phone_type_name?: string
  active_flag?: string
}

interface PhoneFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (phone: Phone) => void
  phone: Phone | null
  personId: number
}

function PhoneFormModal({ isOpen, onClose, onSave, phone }: PhoneFormModalProps) {
  const [phoneNum, setPhoneNum] = useState('')
  const [phoneExt, setPhoneExt] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [phoneTypeId, setPhoneTypeId] = useState<number | ''>('')
  const [phoneTypes, setPhoneTypes] = useState<PhoneType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchPhoneTypes()
      if (phone) {
        setPhoneNum(phone.phone_num || '')
        setPhoneExt(phone.phone_ext || '')
        setCountryCode(phone.country_code || '')
        setPhoneTypeId(phone.pdat_phone_type_id || '')
      } else {
        setPhoneNum('')
        setPhoneExt('')
        setCountryCode('')
        setPhoneTypeId('')
      }
    }
  }, [isOpen, phone])

  const fetchPhoneTypes = async () => {
    try {
      const response = await api.get('/phone-types')
      setPhoneTypes(response.data || [])
      if (!phone && response.data?.length > 0) {
        setPhoneTypeId(response.data[0].pdat_phone_type_id)
      }
    } catch (err) {
      console.error('Failed to fetch phone types:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNum.trim() || !phoneTypeId) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const phoneData: Phone = {
        phone_num: phoneNum.trim(),
        phone_ext: phoneExt.trim() || undefined,
        country_code: countryCode.trim() || undefined,
        pdat_phone_type_id: Number(phoneTypeId),
        phone_type_name: phoneTypes.find(t => t.pdat_phone_type_id === Number(phoneTypeId))?.name
      }

      if (phone?.pdat_pers_phone_id) {
        phoneData.pdat_pers_phone_id = phone.pdat_pers_phone_id
      }

      onSave(phoneData)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save phone')
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
        maxWidth: '400px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#213547' }}>
          {phone ? 'Edit Phone' : 'Add Phone'}
        </h3>

        {error && (
          <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '15px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Phone Number *
            </label>
            <input
              type="tel"
              value={phoneNum}
              onChange={(e) => setPhoneNum(e.target.value)}
              placeholder="e.g., 5551234567"
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

          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Extension
              </label>
              <input
                type="text"
                value={phoneExt}
                onChange={(e) => setPhoneExt(e.target.value)}
                placeholder="e.g., 123"
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
                Country Code
              </label>
              <input
                type="text"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                placeholder="e.g., +1"
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
              Phone Type *
            </label>
            <select
              value={phoneTypeId}
              onChange={(e) => setPhoneTypeId(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
              required
            >
              <option value="">Select type...</option>
              {phoneTypes.map((type) => (
                <option key={type.pdat_phone_type_id} value={type.pdat_phone_type_id}>
                  {type.name}
                </option>
              ))}
            </select>
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

export default PhoneFormModal
