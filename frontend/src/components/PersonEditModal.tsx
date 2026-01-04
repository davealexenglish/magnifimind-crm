import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import EmailFormModal from './EmailFormModal'
import PhoneFormModal from './PhoneFormModal'
import AddressFormModal from './AddressFormModal'
import LinkFormModal from './LinkFormModal'
import NoteFormModal from './NoteFormModal'

interface Person {
  pdat_person_id?: number
  fname: string
  lname: string
  birthday?: string
  business_flag: string
  active_flag?: string
}

interface Email {
  pdat_pers_emails_id?: number | string
  email_addr: string
  pdat_email_types_id: number
  email_type_name?: string
  active_flag?: string
  _isNew?: boolean
  _isDeleted?: boolean
}

interface Phone {
  pdat_pers_phone_id?: number | string
  phone_num: string
  phone_ext?: string
  country_code?: string
  pdat_phone_type_id: number
  phone_type_name?: string
  active_flag?: string
  _isNew?: boolean
  _isDeleted?: boolean
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
  _isNew?: boolean
  _isDeleted?: boolean
}

interface Link {
  pdat_links_id?: number | string
  link_text: string
  link_url: string
  note?: string
  active_flag?: string
  _isNew?: boolean
  _isDeleted?: boolean
}

interface Note {
  pdat_pers_notes_id?: number | string
  note_text: string
  create_date?: string
  active_flag?: string
  _isNew?: boolean
  _isDeleted?: boolean
}

interface PersonEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  personId: number | null
}

function PersonEditModal({ isOpen, onClose, onSave, personId }: PersonEditModalProps) {
  const [person, setPerson] = useState<Person>({ fname: '', lname: '', business_flag: 'N' })
  const [originalPerson, setOriginalPerson] = useState<Person | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [originalEmails, setOriginalEmails] = useState<Email[]>([])
  const [phones, setPhones] = useState<Phone[]>([])
  const [originalPhones, setOriginalPhones] = useState<Phone[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [originalAddresses, setOriginalAddresses] = useState<Address[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [originalLinks, setOriginalLinks] = useState<Link[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [originalNotes, setOriginalNotes] = useState<Note[]>([])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sub-modal states
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [phoneModalOpen, setPhoneModalOpen] = useState(false)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [noteModalOpen, setNoteModalOpen] = useState(false)

  const [editingEmail, setEditingEmail] = useState<Email | null>(null)
  const [editingPhone, setEditingPhone] = useState<Phone | null>(null)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [editingLink, setEditingLink] = useState<Link | null>(null)
  const [editingNote, setEditingNote] = useState<Note | null>(null)

  const [hasChanges, setHasChanges] = useState(false)

  // Fetch person data - always fetch all (active + inactive)
  const fetchPersonData = useCallback(async () => {
    if (!personId) return

    setLoading(true)
    setError(null)

    try {
      // Always fetch with show_inactive=true to show all items
      const response = await api.get(`/people/${personId}/full?show_inactive=true`)
      const data = response.data

      const personData = {
        pdat_person_id: data.person.pdat_person_id,
        fname: data.person.fname || '',
        lname: data.person.lname || '',
        birthday: data.person.birthday ? data.person.birthday.split('T')[0] : '',
        business_flag: data.person.business_flag || 'N',
        active_flag: data.person.active_flag
      }

      setPerson(personData)
      setOriginalPerson(personData)

      const emailsData = data.emails || []
      const phonesData = data.phones || []
      const addressesData = data.addresses || []
      const linksData = data.links || []
      const notesData = data.notes || []

      setEmails(emailsData)
      setOriginalEmails(JSON.parse(JSON.stringify(emailsData)))
      setPhones(phonesData)
      setOriginalPhones(JSON.parse(JSON.stringify(phonesData)))
      setAddresses(addressesData)
      setOriginalAddresses(JSON.parse(JSON.stringify(addressesData)))
      setLinks(linksData)
      setOriginalLinks(JSON.parse(JSON.stringify(linksData)))
      setNotes(notesData)
      setOriginalNotes(JSON.parse(JSON.stringify(notesData)))
      setHasChanges(false)
    } catch (err: any) {
      setError('Failed to load person data: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }, [personId])

  useEffect(() => {
    if (isOpen && personId) {
      fetchPersonData()
    } else if (isOpen && !personId) {
      // New person mode
      setPerson({ fname: '', lname: '', business_flag: 'N' })
      setOriginalPerson(null)
      setEmails([])
      setPhones([])
      setAddresses([])
      setLinks([])
      setNotes([])
      setHasChanges(false)
    }
  }, [isOpen, personId, fetchPersonData])

  // Helper to check if active_flag changed for any item
  const hasActiveChanges = useCallback(() => {
    const emailChanges = emails.some(e => {
      if (e._isNew) return false
      const orig = originalEmails.find(o => o.pdat_pers_emails_id === e.pdat_pers_emails_id)
      return orig && orig.active_flag !== e.active_flag
    })
    const phoneChanges = phones.some(p => {
      if (p._isNew) return false
      const orig = originalPhones.find(o => o.pdat_pers_phone_id === p.pdat_pers_phone_id)
      return orig && orig.active_flag !== p.active_flag
    })
    const addressChanges = addresses.some(a => {
      if (a._isNew) return false
      const orig = originalAddresses.find(o => o.pdat_address_id === a.pdat_address_id)
      return orig && orig.active_flag !== a.active_flag
    })
    const linkChanges = links.some(l => {
      if (l._isNew) return false
      const orig = originalLinks.find(o => o.pdat_links_id === l.pdat_links_id)
      return orig && orig.active_flag !== l.active_flag
    })
    const noteChanges = notes.some(n => {
      if (n._isNew) return false
      const orig = originalNotes.find(o => o.pdat_pers_notes_id === n.pdat_pers_notes_id)
      return orig && orig.active_flag !== n.active_flag
    })
    return emailChanges || phoneChanges || addressChanges || linkChanges || noteChanges
  }, [emails, phones, addresses, links, notes, originalEmails, originalPhones, originalAddresses, originalLinks, originalNotes])

  // Track changes
  useEffect(() => {
    if (!isOpen) return

    const personChanged = originalPerson && (
      person.fname !== originalPerson.fname ||
      person.lname !== originalPerson.lname ||
      person.birthday !== originalPerson.birthday ||
      person.business_flag !== originalPerson.business_flag
    )

    const hasNewOrDeletedItems =
      emails.some(e => e._isNew || e._isDeleted) ||
      phones.some(p => p._isNew || p._isDeleted) ||
      addresses.some(a => a._isNew || a._isDeleted) ||
      links.some(l => l._isNew || l._isDeleted) ||
      notes.some(n => n._isNew || n._isDeleted)

    setHasChanges(Boolean(personChanged || hasNewOrDeletedItems || hasActiveChanges() || (!personId && person.fname)))
  }, [person, originalPerson, emails, phones, addresses, links, notes, isOpen, personId, hasActiveChanges])

  const handleSave = async () => {
    if (!person.fname.trim() || !person.lname.trim()) {
      setError('First name and last name are required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      let currentPersonId = personId

      // Create or update person
      if (!currentPersonId) {
        // Create new person
        const response = await api.post('/persons', {
          fname: person.fname.trim(),
          lname: person.lname.trim(),
          birthday: person.birthday || null,
          business_flag: person.business_flag
        })
        currentPersonId = response.data.ID || response.data.id || response.data.pdat_person_id
      } else {
        // Update existing person
        await api.put(`/persons/${currentPersonId}`, {
          fname: person.fname.trim(),
          lname: person.lname.trim(),
          birthday: person.birthday || null,
          business_flag: person.business_flag
        })
      }

      // Save emails
      for (const email of emails) {
        if (email._isDeleted && email.pdat_pers_emails_id && typeof email.pdat_pers_emails_id === 'number') {
          await api.delete(`/emails/${email.pdat_pers_emails_id}`)
        } else if (email._isNew && !email._isDeleted) {
          await api.post('/emails', {
            email_addr: email.email_addr,
            pdat_email_types_id: email.pdat_email_types_id,
            pdat_person_id: currentPersonId
          })
        } else if (!email._isNew && typeof email.pdat_pers_emails_id === 'number') {
          // Check if active_flag changed
          const orig = originalEmails.find(o => o.pdat_pers_emails_id === email.pdat_pers_emails_id)
          if (orig && orig.active_flag !== email.active_flag) {
            await api.put(`/emails/${email.pdat_pers_emails_id}`, {
              active_flag: email.active_flag
            })
          }
        }
      }

      // Save phones
      for (const phone of phones) {
        if (phone._isDeleted && phone.pdat_pers_phone_id && typeof phone.pdat_pers_phone_id === 'number') {
          await api.delete(`/phones/${phone.pdat_pers_phone_id}`)
        } else if (phone._isNew && !phone._isDeleted) {
          await api.post('/phones', {
            phone_num: phone.phone_num,
            phone_ext: phone.phone_ext,
            country_code: phone.country_code,
            pdat_phone_type_id: phone.pdat_phone_type_id,
            pdat_person_id: currentPersonId
          })
        } else if (!phone._isNew && typeof phone.pdat_pers_phone_id === 'number') {
          // Check if active_flag changed
          const orig = originalPhones.find(o => o.pdat_pers_phone_id === phone.pdat_pers_phone_id)
          if (orig && orig.active_flag !== phone.active_flag) {
            await api.put(`/phones/${phone.pdat_pers_phone_id}`, {
              active_flag: phone.active_flag
            })
          }
        }
      }

      // Save addresses
      for (const address of addresses) {
        if (address._isDeleted && address.pdat_address_id && typeof address.pdat_address_id === 'number') {
          await api.delete(`/addresses/${address.pdat_address_id}`)
        } else if (address._isNew && !address._isDeleted) {
          await api.post('/addresses', {
            addr1: address.addr1,
            addr2: address.addr2,
            city: address.city,
            cmn_states_id: address.cmn_states_id,
            zip: address.zip,
            zip_plus_4: address.zip_plus_4,
            country: address.country,
            pdat_person_id: currentPersonId
          })
        } else if (!address._isNew && typeof address.pdat_address_id === 'number') {
          // Check if active_flag changed
          const orig = originalAddresses.find(o => o.pdat_address_id === address.pdat_address_id)
          if (orig && orig.active_flag !== address.active_flag) {
            await api.put(`/addresses/${address.pdat_address_id}`, {
              active_flag: address.active_flag
            })
          }
        }
      }

      // Save links
      for (const link of links) {
        if (link._isDeleted && link.pdat_links_id && typeof link.pdat_links_id === 'number') {
          await api.delete(`/links/${link.pdat_links_id}`)
        } else if (link._isNew && !link._isDeleted) {
          await api.post('/links', {
            link_text: link.link_text,
            link_url: link.link_url,
            note: link.note,
            pdat_person_id: currentPersonId
          })
        } else if (!link._isNew && typeof link.pdat_links_id === 'number') {
          // Check if active_flag changed
          const orig = originalLinks.find(o => o.pdat_links_id === link.pdat_links_id)
          if (orig && orig.active_flag !== link.active_flag) {
            await api.put(`/links/${link.pdat_links_id}`, {
              active_flag: link.active_flag
            })
          }
        }
      }

      // Save notes
      for (const note of notes) {
        if (note._isDeleted && note.pdat_pers_notes_id && typeof note.pdat_pers_notes_id === 'number') {
          await api.delete(`/notes/${note.pdat_pers_notes_id}`)
        } else if (note._isNew && !note._isDeleted) {
          await api.post('/notes', {
            note_text: note.note_text,
            pdat_person_id: currentPersonId
          })
        } else if (!note._isNew && typeof note.pdat_pers_notes_id === 'number') {
          // Check if active_flag changed
          const orig = originalNotes.find(o => o.pdat_pers_notes_id === note.pdat_pers_notes_id)
          if (orig && orig.active_flag !== note.active_flag) {
            await api.put(`/notes/${note.pdat_pers_notes_id}`, {
              active_flag: note.active_flag
            })
          }
        }
      }

      onSave()
      onClose()
    } catch (err: any) {
      setError('Failed to save: ' + (err.response?.data?.error || err.message))
    } finally {
      setSaving(false)
    }
  }

  // Email handlers
  const handleAddEmail = () => {
    setEditingEmail(null)
    setEmailModalOpen(true)
  }

  const handleEditEmail = (email: Email) => {
    setEditingEmail(email)
    setEmailModalOpen(true)
  }

  const handleSaveEmail = (emailData: Email) => {
    if (editingEmail) {
      setEmails(emails.map(e =>
        e === editingEmail ? { ...emailData, pdat_pers_emails_id: editingEmail.pdat_pers_emails_id } : e
      ))
    } else {
      setEmails([...emails, { ...emailData, _isNew: true, active_flag: 'Y', pdat_pers_emails_id: `new_${Date.now()}` }])
    }
  }

  const handleDeleteEmail = (email: Email) => {
    if (email._isNew) {
      setEmails(emails.filter(e => e !== email))
    } else {
      setEmails(emails.map(e => e === email ? { ...e, _isDeleted: true } : e))
    }
  }

  // Phone handlers
  const handleAddPhone = () => {
    setEditingPhone(null)
    setPhoneModalOpen(true)
  }

  const handleEditPhone = (phone: Phone) => {
    setEditingPhone(phone)
    setPhoneModalOpen(true)
  }

  const handleSavePhone = (phoneData: Phone) => {
    if (editingPhone) {
      setPhones(phones.map(p =>
        p === editingPhone ? { ...phoneData, pdat_pers_phone_id: editingPhone.pdat_pers_phone_id } : p
      ))
    } else {
      setPhones([...phones, { ...phoneData, _isNew: true, active_flag: 'Y', pdat_pers_phone_id: `new_${Date.now()}` }])
    }
  }

  const handleDeletePhone = (phone: Phone) => {
    if (phone._isNew) {
      setPhones(phones.filter(p => p !== phone))
    } else {
      setPhones(phones.map(p => p === phone ? { ...p, _isDeleted: true } : p))
    }
  }

  // Address handlers
  const handleAddAddress = () => {
    setEditingAddress(null)
    setAddressModalOpen(true)
  }

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address)
    setAddressModalOpen(true)
  }

  const handleSaveAddress = (addressData: Address) => {
    if (editingAddress) {
      setAddresses(addresses.map(a =>
        a === editingAddress ? { ...addressData, pdat_address_id: editingAddress.pdat_address_id } : a
      ))
    } else {
      setAddresses([...addresses, { ...addressData, _isNew: true, active_flag: 'Y', pdat_address_id: `new_${Date.now()}` }])
    }
  }

  const handleDeleteAddress = (address: Address) => {
    if (address._isNew) {
      setAddresses(addresses.filter(a => a !== address))
    } else {
      setAddresses(addresses.map(a => a === address ? { ...a, _isDeleted: true } : a))
    }
  }

  // Link handlers
  const handleAddLink = () => {
    setEditingLink(null)
    setLinkModalOpen(true)
  }

  const handleEditLink = (link: Link) => {
    setEditingLink(link)
    setLinkModalOpen(true)
  }

  const handleSaveLink = (linkData: Link) => {
    if (editingLink) {
      setLinks(links.map(l =>
        l === editingLink ? { ...linkData, pdat_links_id: editingLink.pdat_links_id } : l
      ))
    } else {
      setLinks([...links, { ...linkData, _isNew: true, active_flag: 'Y', pdat_links_id: `new_${Date.now()}` }])
    }
  }

  const handleDeleteLink = (link: Link) => {
    if (link._isNew) {
      setLinks(links.filter(l => l !== link))
    } else {
      setLinks(links.map(l => l === link ? { ...l, _isDeleted: true } : l))
    }
  }

  // Note handlers
  const handleAddNote = () => {
    setEditingNote(null)
    setNoteModalOpen(true)
  }

  const handleEditNote = (note: Note) => {
    setEditingNote(note)
    setNoteModalOpen(true)
  }

  const handleSaveNote = (noteData: Note) => {
    if (editingNote) {
      setNotes(notes.map(n =>
        n === editingNote ? { ...noteData, pdat_pers_notes_id: editingNote.pdat_pers_notes_id } : n
      ))
    } else {
      setNotes([...notes, { ...noteData, _isNew: true, active_flag: 'Y', pdat_pers_notes_id: `new_${Date.now()}` }])
    }
  }

  const handleDeleteNote = (note: Note) => {
    if (note._isNew) {
      setNotes(notes.filter(n => n !== note))
    } else {
      setNotes(notes.map(n => n === note ? { ...n, _isDeleted: true } : n))
    }
  }

  // Helper to check if active_flag is 'Y' (handles various formats from DB)
  const isActive = (flag?: string) => {
    if (!flag) return false
    const normalized = String(flag).trim().toUpperCase()
    return normalized === 'Y'
  }

  const renderInactiveStyle = (item: { active_flag?: string, _isDeleted?: boolean }) => {
    if (item._isDeleted || !isActive(item.active_flag)) {
      return { color: '#999' }
    }
    return {}
  }

  // Toggle active handlers
  const handleToggleEmailActive = (email: Email) => {
    setEmails(emails.map(e =>
      e === email ? { ...e, active_flag: isActive(e.active_flag) ? 'N' : 'Y' } : e
    ))
  }

  const handleTogglePhoneActive = (phone: Phone) => {
    setPhones(phones.map(p =>
      p === phone ? { ...p, active_flag: isActive(p.active_flag) ? 'N' : 'Y' } : p
    ))
  }

  const handleToggleAddressActive = (address: Address) => {
    setAddresses(addresses.map(a =>
      a === address ? { ...a, active_flag: isActive(a.active_flag) ? 'N' : 'Y' } : a
    ))
  }

  const handleToggleLinkActive = (link: Link) => {
    setLinks(links.map(l =>
      l === link ? { ...l, active_flag: isActive(l.active_flag) ? 'N' : 'Y' } : l
    ))
  }

  const handleToggleNoteActive = (note: Note) => {
    setNotes(notes.map(n =>
      n === note ? { ...n, active_flag: isActive(n.active_flag) ? 'N' : 'Y' } : n
    ))
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
      alignItems: 'flex-start',
      zIndex: 9999,
      overflowY: 'auto',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '800px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        margin: '20px 0'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#646cff',
          borderRadius: '8px 8px 0 0',
          color: 'white'
        }}>
          <h2 style={{ margin: 0 }}>
            {personId ? `${person.fname} ${person.lname}` : 'New Person'}
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Close
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {error && (
            <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
          ) : (
            <>
              {/* Person Info Section */}
              <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#213547' }}>Person Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>First Name *</label>
                    <input
                      type="text"
                      value={person.fname}
                      onChange={(e) => setPerson({ ...person, fname: e.target.value })}
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
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Last Name *</label>
                    <input
                      type="text"
                      value={person.lname}
                      onChange={(e) => setPerson({ ...person, lname: e.target.value })}
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
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Birthday</label>
                    <input
                      type="date"
                      value={person.birthday || ''}
                      onChange={(e) => setPerson({ ...person, birthday: e.target.value })}
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
                  <div style={{ display: 'flex', alignItems: 'center', paddingTop: '25px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={person.business_flag === 'Y'}
                        onChange={(e) => setPerson({ ...person, business_flag: e.target.checked ? 'Y' : 'N' })}
                      />
                      <span style={{ fontWeight: 'bold' }}>Business</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Emails Section */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, color: '#213547' }}>Emails</h3>
                  <button
                    onClick={handleAddEmail}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    + Add
                  </button>
                </div>
                <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                  {emails.filter(e => !e._isDeleted).length === 0 ? (
                    <div style={{ padding: '15px', color: '#999', textAlign: 'center' }}>No emails</div>
                  ) : (
                    emails.filter(e => !e._isDeleted).map((email, idx, arr) => (
                      <div key={email.pdat_pers_emails_id || idx} style={{
                        padding: '10px 15px',
                        borderBottom: idx < arr.length - 1 ? '1px solid #eee' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        ...renderInactiveStyle(email)
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isActive(email.active_flag)}
                            onChange={() => handleToggleEmailActive(email)}
                            title="Active"
                            style={{ cursor: 'pointer' }}
                          />
                          <div>
                            <span style={{ fontWeight: 'bold' }}>{email.email_addr}</span>
                            <span style={{ color: '#666', marginLeft: '10px' }}>({email.email_type_name})</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => handleEditEmail(email)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✏️</button>
                          <button onClick={() => handleDeleteEmail(email)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Phones Section */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, color: '#213547' }}>Phone Numbers</h3>
                  <button
                    onClick={handleAddPhone}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    + Add
                  </button>
                </div>
                <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                  {phones.filter(p => !p._isDeleted).length === 0 ? (
                    <div style={{ padding: '15px', color: '#999', textAlign: 'center' }}>No phone numbers</div>
                  ) : (
                    phones.filter(p => !p._isDeleted).map((phone, idx, arr) => (
                      <div key={phone.pdat_pers_phone_id || idx} style={{
                        padding: '10px 15px',
                        borderBottom: idx < arr.length - 1 ? '1px solid #eee' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        ...renderInactiveStyle(phone)
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isActive(phone.active_flag)}
                            onChange={() => handleTogglePhoneActive(phone)}
                            title="Active"
                            style={{ cursor: 'pointer' }}
                          />
                          <div>
                            <span style={{ fontWeight: 'bold' }}>{phone.phone_num}</span>
                            {phone.phone_ext && <span style={{ color: '#666' }}> x{phone.phone_ext}</span>}
                            <span style={{ color: '#666', marginLeft: '10px' }}>({phone.phone_type_name})</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => handleEditPhone(phone)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✏️</button>
                          <button onClick={() => handleDeletePhone(phone)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Addresses Section */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, color: '#213547' }}>Addresses</h3>
                  <button
                    onClick={handleAddAddress}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    + Add
                  </button>
                </div>
                <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                  {addresses.filter(a => !a._isDeleted).length === 0 ? (
                    <div style={{ padding: '15px', color: '#999', textAlign: 'center' }}>No addresses</div>
                  ) : (
                    addresses.filter(a => !a._isDeleted).map((address, idx, arr) => (
                      <div key={address.pdat_address_id || idx} style={{
                        padding: '10px 15px',
                        borderBottom: idx < arr.length - 1 ? '1px solid #eee' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        ...renderInactiveStyle(address)
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isActive(address.active_flag)}
                            onChange={() => handleToggleAddressActive(address)}
                            title="Active"
                            style={{ cursor: 'pointer', marginTop: '4px' }}
                          />
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{address.addr1}</div>
                            {address.addr2 && <div>{address.addr2}</div>}
                            <div>{address.city}{address.state_name ? `, ${address.state_name}` : ''} {address.zip}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => handleEditAddress(address)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✏️</button>
                          <button onClick={() => handleDeleteAddress(address)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Links Section */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, color: '#213547' }}>Links</h3>
                  <button
                    onClick={handleAddLink}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    + Add
                  </button>
                </div>
                <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                  {links.filter(l => !l._isDeleted).length === 0 ? (
                    <div style={{ padding: '15px', color: '#999', textAlign: 'center' }}>No links</div>
                  ) : (
                    links.filter(l => !l._isDeleted).map((link, idx, arr) => (
                      <div key={link.pdat_links_id || idx} style={{
                        padding: '10px 15px',
                        borderBottom: idx < arr.length - 1 ? '1px solid #eee' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        ...renderInactiveStyle(link)
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isActive(link.active_flag)}
                            onChange={() => handleToggleLinkActive(link)}
                            title="Active"
                            style={{ cursor: 'pointer', marginTop: '4px' }}
                          />
                          <div>
                            <a href={link.link_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 'bold', color: '#646cff' }}>
                              {link.link_text || link.link_url}
                            </a>
                            {link.note && <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{link.note}</div>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => handleEditLink(link)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✏️</button>
                          <button onClick={() => handleDeleteLink(link)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Notes Section */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, color: '#213547' }}>Notes</h3>
                  <button
                    onClick={handleAddNote}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    + Add
                  </button>
                </div>
                <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                  {notes.filter(n => !n._isDeleted).length === 0 ? (
                    <div style={{ padding: '15px', color: '#999', textAlign: 'center' }}>No notes</div>
                  ) : (
                    notes.filter(n => !n._isDeleted).map((note, idx, arr) => (
                      <div key={note.pdat_pers_notes_id || idx} style={{
                        padding: '10px 15px',
                        borderBottom: idx < arr.length - 1 ? '1px solid #eee' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        ...renderInactiveStyle(note)
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={isActive(note.active_flag)}
                            onChange={() => handleToggleNoteActive(note)}
                            title="Active"
                            style={{ cursor: 'pointer', marginTop: '4px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{note.note_text}</div>
                            {note.create_date && (
                              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                {new Date(note.create_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '5px', marginLeft: '10px' }}>
                          <button onClick={() => handleEditNote(note)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✏️</button>
                          <button onClick={() => handleDeleteNote(note)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button
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
            onClick={handleSave}
            disabled={saving || !hasChanges}
            style={{
              padding: '10px 20px',
              backgroundColor: hasChanges ? '#646cff' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving || !hasChanges ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Sub-modals */}
      <EmailFormModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSave={handleSaveEmail}
        email={editingEmail}
        personId={personId || 0}
      />
      <PhoneFormModal
        isOpen={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        onSave={handleSavePhone}
        phone={editingPhone}
        personId={personId || 0}
      />
      <AddressFormModal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSave={handleSaveAddress}
        address={editingAddress}
        personId={personId || 0}
      />
      <LinkFormModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onSave={handleSaveLink}
        link={editingLink}
        personId={personId || 0}
      />
      <NoteFormModal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        onSave={handleSaveNote}
        note={editingNote}
        personId={personId || 0}
      />
    </div>
  )
}

export default PersonEditModal
