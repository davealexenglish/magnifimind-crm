// @ts-nocheck
/**
 * Password Vault Component
 *
 * Client-side password vault with encryption/decryption
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { PasswordEntry, PasswordCollection, PasswordState } from '../utils/passwordStateManager';
import ConfirmationModal from './ConfirmationModal';

const PasswordVault = () => {
  const navigate = useNavigate();
  const [passwords] = useState(new PasswordCollection());
  const [version, setVersion] = useState(0);
  const [masterPassword, setMasterPassword] = useState('');
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, passwordId: null, description: '' });
  const [filter, setFilter] = useState('');
  const [linkModal, setLinkModal] = useState({ isOpen: false, passwordId: null, linkUrl: '' });
  const [navWarningModal, setNavWarningModal] = useState({ isOpen: false, destination: '' });

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return passwords.getAll().some(entry => entry.isNew() || entry.isModified() || entry._pendingSaveEncrypted);
  }, [version]);

  // Helper to check if an entry needs saving
  const needsSave = (entry) => {
    return entry.isNew() || entry.isModified() || entry._pendingSaveEncrypted;
  };

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Custom navigation handler that checks for unsaved changes
  const safeNavigate = (destination) => {
    if (hasUnsavedChanges) {
      setNavWarningModal({ isOpen: true, destination });
    } else {
      navigate(destination);
    }
  };

  useEffect(() => {
    loadPasswords();
  }, []);

  const loadPasswords = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/v1/passwords');
      const data = await response.json();
      console.log('Load passwords response:', data);
      console.log('Number of passwords:', data.passwords?.length || 0);
      passwords.loadFromAPI(data.passwords || []);
      setVersion(v => v + 1);
    } catch (err) {
      console.error('Error loading passwords:', err);
      setError('Failed to load passwords: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async (passwordId) => {
    if (!masterPassword) {
      setError('Please enter master password first');
      return;
    }
    const entry = passwords.get(passwordId);
    if (!entry) return;
    try {
      await entry.decrypt(masterPassword);
      setVersion(v => v + 1);
      setError(null);
    } catch (err) {
      setError('Decryption failed - incorrect master password');
    }
  };

  const handleLock = async (passwordId) => {
    const entry = passwords.get(passwordId);
    if (!entry) return;

    // If new or modified, we need to encrypt with the master password
    if (entry.state === PasswordState.MODIFIED_DECRYPTED || entry.state === PasswordState.NEW) {
      if (!masterPassword) {
        setError('Please enter master password to lock');
        return;
      }
      if (!entry.password) {
        setError('Please enter a password before locking');
        return;
      }
      try {
        // Import encryption function
        const { encryptPassword } = await import('../utils/passwordEncryption');
        // Encrypt the plaintext password
        const encryptedPassword = await encryptPassword(entry.password, masterPassword);
        // Store the new encrypted value (this is what will be saved)
        entry.password = encryptedPassword;
        entry.state = PasswordState.ENCRYPTED;
        // Mark that we have a new encrypted value that needs saving
        entry._pendingSaveEncrypted = encryptedPassword;
        entry._wasNew = entry.isNew ? true : entry._wasNew; // Track if it was new
        setVersion(v => v + 1);
        setError(null);
      } catch (err) {
        setError('Failed to encrypt password: ' + err.message);
      }
    } else {
      // Not modified, just revert to original encrypted value
      entry.lock();
      setVersion(v => v + 1);
    }
  };

  const handleDecryptAll = async () => {
    if (!masterPassword) {
      setError('Please enter master password first');
      return;
    }
    setLoading(true);
    const result = await passwords.decryptAll(masterPassword);
    setLoading(false);
    if (result.failed > 0) {
      setError(`Decrypted ${result.success} passwords, ${result.failed} failed`);
    } else {
      setError(null);
    }
    setVersion(v => v + 1);
  };

  const handleLockAll = () => {
    passwords.lockAll();
    setMasterPassword('');
    setVersion(v => v + 1);
  };

  const handleSave = async (passwordId) => {
    const entry = passwords.get(passwordId);
    if (!entry) {
      console.error('Entry not found for ID:', passwordId);
      return;
    }

    // If there's a pre-encrypted password from locking, we don't need master password
    const hasPendingEncrypted = entry._pendingSaveEncrypted;

    if (!hasPendingEncrypted && !masterPassword) {
      setError('Please enter master password to save');
      return;
    }

    // Check if this is a new entry (either currently NEW state, or was NEW before locking)
    const wasNew = entry.isNew() || entry._wasNew || (typeof entry.id === 'string' && entry.id.startsWith('new-'));
    const tempId = passwordId;

    setLoading(true);
    try {
      let payload;
      if (hasPendingEncrypted) {
        // Use the pre-encrypted password from lock operation
        payload = {
          description: entry.description,
          name: entry.name,
          password: entry._pendingSaveEncrypted,
          optionalLink: entry.optionalLink,
          linkUrl: entry.linkUrl || null
        };
      } else {
        // Normal flow: encrypt now
        payload = await entry.prepareForSave(masterPassword);
      }
      // For new entries, don't include ID in URL (even temporary IDs like "new-123")
      const url = wasNew ? '/api/v1/passwords' : `/api/v1/passwords/${entry.id}`;
      const method = wasNew ? 'POST' : 'PUT';
      console.log('Saving password:', { url, method, payload: { ...payload, password: '[ENCRYPTED]' } });
      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Save failed:', errorData);
        throw new Error(errorData.error || 'Save failed');
      }
      const responseData = await response.json();
      console.log('Save successful, response:', responseData);

      // Instead of reloading all passwords, use the response to update our collection
      if (wasNew) {
        // Remove the temporary entry and add the new one with real database ID
        passwords.remove(tempId);
        const newEntry = PasswordEntry.fromAPI(responseData);
        passwords.add(newEntry);
        console.log('Replaced temporary entry', tempId, 'with database entry', responseData.id);
      } else {
        // For updates, the entry is already in the collection with the correct ID
        // Just update its state to ENCRYPTED since it was saved
        entry.state = PasswordState.ENCRYPTED;
        entry.originalEncrypted = entry.password;
        entry.originalDescription = entry.description;
        entry.originalName = entry.name;
        entry.originalLinkUrl = entry.linkUrl;
        // Clear the pending save flags
        delete entry._pendingSaveEncrypted;
        delete entry._wasNew;
        console.log('Updated existing entry', entry.id);
      }

      setVersion(v => v + 1);
      setError(null);
    } catch (err) {
      console.error('Error during save:', err);
      setError('Failed to save: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    const passwordId = deleteModal.passwordId;
    setDeleteModal({ isOpen: false, passwordId: null, description: '' });
    setLoading(true);
    try {
      const response = await apiFetch(`/api/v1/passwords/${passwordId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Delete failed');
      passwords.remove(passwordId);
      setVersion(v => v + 1);
      setError(null);
    } catch (err) {
      setError('Failed to delete: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, entryDesc) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(`Copied ${entryDesc}`);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const addNewPassword = () => {
    const newEntry = PasswordEntry.createNew({
      description: '',
      name: '',
      password: '',
      linkUrl: ''
    });
    passwords.add(newEntry);
    setVersion(v => v + 1);
  };

  const openLinkModal = (passwordId) => {
    const entry = passwords.get(passwordId);
    if (entry) {
      setLinkModal({ isOpen: true, passwordId, linkUrl: entry.linkUrl || '' });
    }
  };

  const saveLinkModal = () => {
    const entry = passwords.get(linkModal.passwordId);
    if (entry) {
      entry.linkUrl = linkModal.linkUrl;
      setVersion(v => v + 1);
    }
    setLinkModal({ isOpen: false, passwordId: null, linkUrl: '' });
  };

  const stateCounts = passwords.getStateCounts();

  // Filter passwords based on filter text
  const filteredPasswords = passwords.getAll().filter(entry => {
    if (!filter) return true;
    const filterLower = filter.toLowerCase();
    return (
      (entry.description || '').toLowerCase().includes(filterLower) ||
      (entry.name || '').toLowerCase().includes(filterLower) ||
      (entry.linkUrl || '').toLowerCase().includes(filterLower)
    );
  });

  return (
    <div className="password-vault" style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Hidden form to absorb browser autocomplete */}
      <form style={{ display: 'none' }} aria-hidden="true">
        <input type="text" name="fake-username-field" tabIndex={-1} />
        <input type="password" name="fake-password-field" tabIndex={-1} />
      </form>

      <h1>Password Vault</h1>

      {/* Master Password Section */}
      <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
        <h3>Master Password</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <input
            type={showMasterPassword ? 'text' : 'password'}
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            placeholder="Enter master password"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-form-type="other"
            data-lpignore="true"
            data-1p-ignore="true"
            name="master-key-input"
            id="master-key-input"
            style={{ flex: '1', minWidth: '200px', padding: '8px' }}
          />
          <button onClick={() => setShowMasterPassword(!showMasterPassword)} style={{ padding: '8px 16px' }}>
            {showMasterPassword ? 'Hide' : 'Show'}
          </button>
          <button onClick={handleDecryptAll} disabled={!masterPassword || loading} style={{ padding: '8px 16px' }}>
            Decrypt All
          </button>
          <button onClick={handleLockAll} style={{ padding: '8px 16px' }}>
            Lock All
          </button>
          <button onClick={() => setMasterPassword('')} style={{ padding: '8px 16px' }}>
            Clear
          </button>
        </div>
        <small style={{ color: '#666' }}>
          Master password is NEVER sent to the server. Encryption/decryption happens in your browser only.
        </small>
        <div style={{ marginTop: '10px', fontSize: '14px' }}>
          Total: {passwords.getAll().length} |
          Encrypted: {stateCounts[PasswordState.ENCRYPTED]} |
          Decrypted: {stateCounts[PasswordState.DECRYPTED]} |
          Modified: {stateCounts[PasswordState.MODIFIED_DECRYPTED]} |
          New: {stateCounts[PasswordState.NEW]}
        </div>
      </div>

      {/* Filter Section */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <label style={{ fontWeight: 'bold' }}>Filter:</label>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by description, username, or link..."
          style={{ flex: '1', maxWidth: '400px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        {filter && (
          <button onClick={() => setFilter('')} style={{ padding: '8px 16px' }}>
            Clear
          </button>
        )}
        <span style={{ color: '#666', fontSize: '14px' }}>
          Showing {filteredPasswords.length} of {passwords.getAll().length}
        </span>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', borderRadius: '5px' }}>
          {error}
        </div>
      )}
      {copySuccess && (
        <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', borderRadius: '5px' }}>
          {copySuccess}
        </div>
      )}
      {loading && <div style={{ marginBottom: '20px' }}>Loading...</div>}

      {/* Add New Password Button */}
      <button onClick={addNewPassword} style={{ padding: '10px 20px', marginBottom: '20px', fontSize: '16px' }}>
        + Add New Password
      </button>

      {/* Password List Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Username</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left', minWidth: '200px' }}>Password</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Link</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPasswords.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  {filter ? 'No passwords match the filter.' : 'No passwords saved. Click "Add New Password" to create one.'}
                </td>
              </tr>
            ) : (
              filteredPasswords.map((entry, index) => (
                <tr key={entry.id || `new-${index}`} style={{ borderBottom: '1px solid #ddd' }}>
                  {/* Description */}
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <input
                      type="text"
                      value={entry.description || ''}
                      onChange={(e) => {
                        entry.description = e.target.value;
                        setVersion(v => v + 1);
                      }}
                      autoComplete="off"
                      data-form-type="other"
                      data-lpignore="true"
                      style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '3px' }}
                      placeholder="Description"
                    />
                  </td>

                  {/* Username */}
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <input
                      type="text"
                      value={entry.name || ''}
                      onChange={(e) => {
                        entry.name = e.target.value;
                        setVersion(v => v + 1);
                      }}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      data-form-type="other"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '3px' }}
                      placeholder="Username"
                    />
                  </td>

                  {/* Password */}
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={entry.isEncrypted() ? '••••••••••' : (entry.password || '')}
                        onChange={(e) => {
                          entry.updatePassword(e.target.value);
                          setVersion(v => v + 1);
                        }}
                        disabled={entry.isEncrypted()}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        data-form-type="other"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        style={{
                          flex: '1',
                          padding: '6px',
                          border: '1px solid #ccc',
                          borderRadius: '3px',
                          backgroundColor: entry.isEncrypted() ? '#f5f5f5' : 'white',
                          fontFamily: entry.isEncrypted() ? 'inherit' : 'monospace'
                        }}
                        placeholder="Password"
                      />
                      {entry.isEncrypted() ? (
                        <button
                          onClick={() => handleDecrypt(entry.id)}
                          disabled={!masterPassword}
                          style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}
                          title="Decrypt password"
                        >
                          Decrypt
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => copyToClipboard(entry.password, entry.description)}
                            style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}
                            title="Copy to clipboard"
                          >
                            Copy
                          </button>
                          <button
                            onClick={() => handleLock(entry.id)}
                            disabled={!entry.password}
                            style={{
                              padding: '6px 12px',
                              whiteSpace: 'nowrap',
                              cursor: !entry.password ? 'not-allowed' : 'pointer',
                              opacity: !entry.password ? 0.5 : 1
                            }}
                            title={!entry.password ? 'Enter a password first' : 'Lock (encrypt)'}
                          >
                            Lock
                          </button>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Link */}
                  <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                    {entry.linkUrl ? (
                      <a href={entry.linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
                        link
                      </a>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                    <button
                      onClick={() => openLinkModal(entry.id)}
                      style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '12px' }}
                      title="Edit link"
                    >
                      Edit
                    </button>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                    {entry.state === PasswordState.ENCRYPTED && <span style={{ color: '#666' }}>Encrypted</span>}
                    {entry.state === PasswordState.DECRYPTED && <span style={{ color: '#28a745' }}>Decrypted</span>}
                    {entry.state === PasswordState.MODIFIED_DECRYPTED && <span style={{ color: '#ffc107' }}>Modified</span>}
                    {entry.state === PasswordState.NEW && <span style={{ color: '#17a2b8' }}>New</span>}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleSave(entry.id)}
                        disabled={loading || !needsSave(entry)}
                        style={{
                          padding: '6px 12px',
                          whiteSpace: 'nowrap',
                          backgroundColor: needsSave(entry) ? '#28a745' : '#ccc',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: needsSave(entry) ? 'pointer' : 'not-allowed'
                        }}
                        title={entry._pendingSaveEncrypted ? "Save encrypted changes" : "Save and encrypt"}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setDeleteModal({ isOpen: true, passwordId: entry.id, description: entry.description || 'this password' })}
                        disabled={loading || entry.isNew()}
                        style={{
                          padding: '6px 12px',
                          whiteSpace: 'nowrap',
                          backgroundColor: entry.isNew() ? '#ccc' : '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: entry.isNew() ? 'not-allowed' : 'pointer'
                        }}
                        title="Delete password"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Instructions */}
      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e7f3ff', border: '1px solid #b3d9ff', borderRadius: '5px', textAlign: 'left' }}>
        <h4 style={{ textAlign: 'left' }}>How to use:</h4>
        <ol style={{ textAlign: 'left' }}>
          <li><strong>Add Password:</strong> Click "Add New Password", fill in description, username, and password, then click "Save"</li>
          <li><strong>View Password:</strong> Enter your master password above, then click "Decrypt" on the password you want to view</li>
          <li><strong>Copy Password:</strong> After decrypting, click "Copy" to copy the password to your clipboard</li>
          <li><strong>Lock Password:</strong> Click "Lock" to re-encrypt the password after viewing</li>
          <li><strong>Add Link:</strong> Click "Edit" in the Link column to add a URL associated with this password</li>
          <li><strong>Filter:</strong> Use the filter box at the top to search by description, username, or link</li>
        </ol>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        title="Delete Password"
        message={`Are you sure you want to delete ${deleteModal.description}? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, passwordId: null, description: '' })}
        isDangerous={true}
      />

      {/* Link Edit Modal */}
      {linkModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            minWidth: '500px',
            maxWidth: '600px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginTop: 0 }}>Edit Link URL</h3>
            <table style={{ width: '100%', marginBottom: '20px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', textAlign: 'right', width: '100px', verticalAlign: 'middle' }}>
                    <label style={{ fontWeight: 'bold' }}>URL:</label>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="url"
                      value={linkModal.linkUrl}
                      onChange={(e) => setLinkModal({ ...linkModal, linkUrl: e.target.value })}
                      placeholder="https://example.com"
                      style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' }}
                      autoFocus
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setLinkModal({ isOpen: false, passwordId: null, linkUrl: '' })}
                style={{ padding: '10px 20px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={saveLinkModal}
                style={{ padding: '10px 20px', border: 'none', borderRadius: '4px', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Warning Modal */}
      <ConfirmationModal
        isOpen={navWarningModal.isOpen}
        title="Unsaved Changes"
        message="You have unsaved password changes. Are you sure you want to leave this page? Your changes will be lost."
        confirmText="Leave Page"
        cancelText="Stay"
        onConfirm={() => {
          setNavWarningModal({ isOpen: false, destination: '' });
          navigate(navWarningModal.destination);
        }}
        onCancel={() => setNavWarningModal({ isOpen: false, destination: '' })}
        isDangerous={true}
      />
    </div>
  );
};

export default PasswordVault;
