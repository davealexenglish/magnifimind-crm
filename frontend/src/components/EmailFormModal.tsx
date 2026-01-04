import { useState, useEffect } from 'react'
import api from '../utils/api'

interface EmailType {
  pdat_email_types_id: number
  name: string
}

interface Email {
  pdat_pers_emails_id?: number | string
  email_addr: string
  pdat_email_types_id: number
  email_type_name?: string
  active_flag?: string
}

interface EmailFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (email: Email) => void
  email: Email | null
  personId: number
}

function EmailFormModal({ isOpen, onClose, onSave, email }: EmailFormModalProps) {
  const [emailAddr, setEmailAddr] = useState('')
  const [emailTypeId, setEmailTypeId] = useState<number | ''>('')
  const [emailTypes, setEmailTypes] = useState<EmailType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchEmailTypes()
      if (email) {
        setEmailAddr(email.email_addr || '')
        setEmailTypeId(email.pdat_email_types_id || '')
      } else {
        setEmailAddr('')
        setEmailTypeId('')
      }
    }
  }, [isOpen, email])

  const fetchEmailTypes = async () => {
    try {
      const response = await api.get('/email-types')
      setEmailTypes(response.data || [])
      if (!email && response.data?.length > 0) {
        setEmailTypeId(response.data[0].pdat_email_types_id)
      }
    } catch (err) {
      console.error('Failed to fetch email types:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailAddr.trim() || !emailTypeId) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const emailData: Email = {
        email_addr: emailAddr.trim(),
        pdat_email_types_id: Number(emailTypeId),
        email_type_name: emailTypes.find(t => t.pdat_email_types_id === Number(emailTypeId))?.name
      }

      if (email?.pdat_pers_emails_id) {
        emailData.pdat_pers_emails_id = email.pdat_pers_emails_id
      }

      onSave(emailData)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save email')
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
          {email ? 'Edit Email' : 'Add Email'}
        </h3>

        {error && (
          <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '15px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Email Address *
            </label>
            <input
              type="email"
              value={emailAddr}
              onChange={(e) => setEmailAddr(e.target.value)}
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Email Type *
            </label>
            <select
              value={emailTypeId}
              onChange={(e) => setEmailTypeId(Number(e.target.value))}
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
              {emailTypes.map((type) => (
                <option key={type.pdat_email_types_id} value={type.pdat_email_types_id}>
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

export default EmailFormModal
