import { useState, useRef } from 'react'
import { apiFetch } from '../utils/api'
import ConfirmationModal from './ConfirmationModal'

function BackupRestore() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [restoreModal, setRestoreModal] = useState<{ isOpen: boolean; file: File | null }>({
    isOpen: false,
    file: null
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleBackup = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await apiFetch('/api/v1/admin/backup', {
        method: 'GET'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Backup failed')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'magnifimind_backup.dump'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match) {
          filename = match[1]
        }
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setSuccess(`Backup downloaded successfully: ${filename}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setRestoreModal({ isOpen: true, file })
    }
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const confirmRestore = async () => {
    if (!restoreModal.file) return

    setRestoreModal({ isOpen: false, file: null })
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('backup', restoreModal.file)

      const response = await apiFetch('/api/v1/admin/restore', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Restore failed')
      }

      const result = await response.json()
      setSuccess(result.message || 'Database restored successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 1.5rem 0', fontSize: '1.75rem', color: '#213547' }}>
        💾 Backup & Restore
      </h1>

      {/* Error message */}
      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          backgroundColor: '#ffebee',
          color: '#d32f2f',
          borderRadius: '8px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          backgroundColor: '#d4edda',
          color: '#155724',
          borderRadius: '8px',
          border: '1px solid #c3e6cb'
        }}>
          {success}
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          backgroundColor: '#e7f3ff',
          color: '#0066cc',
          borderRadius: '8px',
          border: '1px solid #b3d9ff',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
          Processing... Please wait.
        </div>
      )}

      {/* Backup Section */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#213547' }}>
          📥 Backup Database
        </h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Download a complete binary backup of the database. This backup can be used to restore
          the database to this exact state.
        </p>
        <button
          onClick={handleBackup}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: loading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          📥 Download Backup
        </button>
      </div>

      {/* Restore Section */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#213547' }}>
          📤 Restore Database
        </h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Upload a backup file to restore the database. <strong style={{ color: '#d32f2f' }}>
          Warning: This will replace ALL existing data!</strong>
        </p>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".dump,.backup,.sql"
          style={{ display: 'none' }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: loading ? '#ccc' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          📤 Upload & Restore
        </button>
      </div>

      {/* Info Section */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        backgroundColor: '#fff3cd',
        borderRadius: '8px',
        border: '1px solid #ffc107'
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#856404' }}>
          ⚠️ Important Notes
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#856404' }}>
          <li>Backups include all data: contacts, passwords (encrypted), settings, etc.</li>
          <li>Restoring will completely replace all existing data with the backup.</li>
          <li>Always create a backup before restoring to avoid data loss.</li>
          <li>Backup files are in PostgreSQL custom format (.dump).</li>
        </ul>
      </div>

      {/* Restore Confirmation Modal */}
      <ConfirmationModal
        isOpen={restoreModal.isOpen}
        title="⚠️ Restore Database"
        message={
          <div>
            <p style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: '1.1rem' }}>
              WARNING: This action is DESTRUCTIVE!
            </p>
            <p>You are about to restore the database from:</p>
            <p style={{
              backgroundColor: '#f5f5f5',
              padding: '0.5rem',
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}>
              {restoreModal.file?.name}
            </p>
            <p>This will:</p>
            <ul style={{ textAlign: 'left', marginLeft: '1rem' }}>
              <li><strong>DELETE</strong> all current data</li>
              <li><strong>REPLACE</strong> it with data from the backup</li>
            </ul>
            <p style={{ marginTop: '1rem', fontWeight: 'bold', color: '#d32f2f' }}>
              This action CANNOT be undone!
            </p>
          </div>
        }
        confirmText="RESTORE DATABASE"
        cancelText="Cancel"
        onConfirm={confirmRestore}
        onCancel={() => setRestoreModal({ isOpen: false, file: null })}
        isDangerous={true}
      />
    </div>
  )
}

export default BackupRestore
