import { useState, useEffect } from 'react'

interface Note {
  pdat_pers_notes_id?: number | string
  note_text: string
  create_date?: string
  active_flag?: string
}

interface NoteFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (note: Note) => void
  note: Note | null
  personId: number
}

function NoteFormModal({ isOpen, onClose, onSave, note }: NoteFormModalProps) {
  const [noteText, setNoteText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (note) {
        setNoteText(note.note_text || '')
      } else {
        setNoteText('')
      }
    }
  }, [isOpen, note])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteText.trim()) {
      setError('Note text is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const noteData: Note = {
        note_text: noteText.trim()
      }

      if (note?.pdat_pers_notes_id) {
        noteData.pdat_pers_notes_id = note.pdat_pers_notes_id
      }

      onSave(noteData)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save note')
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
        maxWidth: '600px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#213547' }}>
          {note ? 'Edit Note' : 'Add Note'}
        </h3>

        {error && (
          <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '15px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Note *
            </label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter your note..."
              rows={8}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
              autoFocus
              required
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

export default NoteFormModal
