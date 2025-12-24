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
import VerifyResultsModal from './VerifyResultsModal';
import ImportCSVModal from './ImportCSVModal';
import LinkEditModal from './LinkEditModal';
import AddPasswordModal from './AddPasswordModal';

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); // null, 'checking', { passed: [], failed: [] }

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
      const response = await apiFetch('/api/v1/passwords?limit=10000');
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
        entry._wasNew = entry.isNew() ? true : entry._wasNew; // Track if it was new
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

  const handleVerifyAll = async () => {
    if (!masterPassword) {
      setError('Please enter master password first');
      return;
    }
    setVerifyResult('checking');
    setError(null);

    const { decryptPassword } = await import('../utils/passwordEncryption');
    const allEntries = passwords.getAll();
    const encryptedEntries = allEntries.filter(e => e.isEncrypted() && e.password);
    const passed = [];
    const failed = [];

    for (const entry of encryptedEntries) {
      try {
        await decryptPassword(entry.password, masterPassword);
        passed.push(entry.description || entry.id);
      } catch (err) {
        failed.push(entry.description || entry.id);
      }
    }

    setVerifyResult({ passed, failed, total: encryptedEntries.length });
  };

  const handleSave = async (passwordId) => {
    const entry = passwords.get(passwordId);
    if (!entry) {
      console.error('Entry not found for ID:', passwordId);
      return;
    }

    // If there's a pre-encrypted password from locking, we don't need master password
    const hasPendingEncrypted = entry._pendingSaveEncrypted;

    // Master password is required (UI is hidden without it, but double-check)
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

  const copyToClipboard = async (entry) => {
    if (!entry) return;

    try {
      let textToCopy = entry.password;

      // If encrypted, decrypt first without changing UI state
      if (entry.isEncrypted()) {
        if (!masterPassword) {
          setError('Please enter master password to copy');
          return;
        }
        const { decryptPassword } = await import('../utils/passwordEncryption');
        textToCopy = await decryptPassword(entry.password, masterPassword);
      }

      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(`Copied ${entry.description}`);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleAddPasswordSave = async (data: { description: string; name: string; password: string; linkUrl: string; isLocked: boolean }) => {
    // If the password is already locked (encrypted), use it directly
    // Otherwise, encrypt it before saving
    let encryptedPassword = data.password;

    if (!data.isLocked) {
      const { encryptPassword } = await import('../utils/passwordEncryption');
      encryptedPassword = await encryptPassword(data.password, masterPassword);
    }

    const payload = {
      description: data.description,
      name: data.name,
      password: encryptedPassword,
      optionalLink: null,
      linkUrl: data.linkUrl || null
    };

    const response = await apiFetch('/api/v1/passwords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Save failed');
    }

    const responseData = await response.json();
    const newEntry = PasswordEntry.fromAPI(responseData);
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

  // Filter passwords based on Description only
  const filteredPasswords = passwords.getAll().filter(entry => {
    if (!filter) return true;
    const filterLower = filter.toLowerCase();
    return (entry.description || '').toLowerCase().includes(filterLower);
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
      <div style={{ marginBottom: '15px', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <strong style={{ marginRight: '5px' }}>Master Password:</strong>
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
            style={{ width: '200px', padding: '6px 8px' }}
          />
          <button onClick={() => setShowMasterPassword(!showMasterPassword)} style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
            {showMasterPassword ? 'Hide' : 'Show'}
          </button>
          <button onClick={() => setMasterPassword('')} style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
            Clear
          </button>
          <button onClick={handleVerifyAll} disabled={!masterPassword || verifyResult === 'checking'} style={{ padding: '6px 12px', backgroundColor: !masterPassword ? '#ccc' : '#17a2b8', color: 'white', border: 'none', borderRadius: '3px', cursor: !masterPassword ? 'not-allowed' : 'pointer' }}>
            {verifyResult === 'checking' ? 'Checking...' : '✓ Verify All'}
          </button>
          <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#666' }}>
            Total: {passwords.getAll().length} | 🔒 {stateCounts[PasswordState.ENCRYPTED]} | 🔓 {stateCounts[PasswordState.DECRYPTED]} | ✎ {stateCounts[PasswordState.MODIFIED_DECRYPTED]} | ✚ {stateCounts[PasswordState.NEW]}
          </span>
        </div>
        <small style={{ color: '#888', fontSize: '11px' }}>
          Master password is NEVER sent to the server. Encryption/decryption happens in your browser only.
        </small>
      </div>

      {/* Show prompt if no master password, otherwise show the full UI */}
      {!masterPassword ? (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px' }}>
          <h3 style={{ color: '#6c757d', marginBottom: '10px' }}>Enter Master Password to get started</h3>
          <p style={{ color: '#888', fontSize: '14px' }}>Your passwords are encrypted and require the master password to view or modify.</p>
        </div>
      ) : (
        <>
          {/* Filter and Action Buttons */}
          <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: 'bold' }}>Filter:</label>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by description..."
              style={{ flex: '1', maxWidth: '300px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            {filter && (
              <button onClick={() => setFilter('')} style={{ padding: '5px 10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                Clear
              </button>
            )}
            <span style={{ color: '#666', fontSize: '13px' }}>
              {filteredPasswords.length} / {passwords.getAll().length}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowAddModal(true)} style={{ padding: '6px 14px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                ✚ Add New
              </button>
              <button onClick={() => setShowImportModal(true)} style={{ padding: '6px 14px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                📥 Import CSV
              </button>
            </div>
          </div>

          {/* Error/Success Messages */}
      {error && (
        <div style={{ padding: '8px 12px', marginBottom: '10px', backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', borderRadius: '4px', fontSize: '13px' }}>
          {error}
        </div>
      )}
      {/* Toast notification for copy success - fixed position bottom right */}
      {copySuccess && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '10px 16px',
          backgroundColor: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          fontSize: '13px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 1000
        }}>
          {copySuccess}
        </div>
      )}
      {loading && <div style={{ marginBottom: '10px', fontSize: '13px' }}>Loading...</div>}

      {/* Password List Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'left', width: '28%' }}>Description</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'left', width: '22%' }}>Username</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'left', width: '22%' }}>Password</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', width: '8%' }}>Link</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', width: '8%' }}>Status</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', width: '12%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPasswords.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '15px', textAlign: 'center', color: '#999' }}>
                  {filter ? 'No passwords match the filter.' : 'No passwords saved. Click "Add New" to create one.'}
                </td>
              </tr>
            ) : (
              filteredPasswords.map((entry, index) => (
                <tr key={entry.id || `new-${index}`} style={{ borderBottom: '1px solid #ddd' }}>
                  {/* Description */}
                  <td style={{ padding: '4px 6px', border: '1px solid #ddd' }}>
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
                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px', fontSize: '13px', boxSizing: 'border-box' }}
                      placeholder="Description"
                    />
                  </td>

                  {/* Username */}
                  <td style={{ padding: '4px 6px', border: '1px solid #ddd' }}>
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
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
                        style={{ flex: '1', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px', fontSize: '13px', boxSizing: 'border-box' }}
                        placeholder="Username"
                      />
                      <button
                        onClick={async () => {
                          if (entry.name) {
                            await navigator.clipboard.writeText(entry.name);
                            setCopySuccess(`Copied username`);
                            setTimeout(() => setCopySuccess(''), 2000);
                          }
                        }}
                        disabled={!entry.name}
                        style={{ padding: '4px 8px', background: 'none', border: 'none', outline: 'none', cursor: entry.name ? 'pointer' : 'not-allowed', fontSize: '16px', opacity: entry.name ? 1 : 0.4, flexShrink: 0 }}
                        title="Copy username"
                      >
                        📋
                      </button>
                    </div>
                  </td>

                  {/* Password */}
                  <td style={{ padding: '4px 6px', border: '1px solid #ddd' }}>
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={entry.isEncrypted() ? '••••••' : (entry.password || '')}
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
                          minWidth: '60px',
                          padding: '4px 6px',
                          border: '1px solid #ccc',
                          borderRadius: '3px',
                          backgroundColor: entry.isEncrypted() ? '#f5f5f5' : 'white',
                          fontFamily: entry.isEncrypted() ? 'inherit' : 'monospace',
                          fontSize: '13px'
                        }}
                        placeholder="Password"
                      />
                      <button
                        onClick={() => copyToClipboard(entry)}
                        disabled={entry.isEncrypted() && !masterPassword}
                        style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: (entry.isEncrypted() && !masterPassword) ? 'not-allowed' : 'pointer', fontSize: '16px', opacity: (entry.isEncrypted() && !masterPassword) ? 0.4 : 1 }}
                        title="Copy to clipboard"
                      >
                        📋
                      </button>
                      {entry.isEncrypted() ? (
                        <button
                          onClick={() => handleDecrypt(entry.id)}
                          disabled={!masterPassword}
                          style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: !masterPassword ? 'not-allowed' : 'pointer', fontSize: '16px', opacity: !masterPassword ? 0.4 : 1 }}
                          title="Decrypt password"
                        >
                          🔒
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLock(entry.id)}
                          disabled={!entry.password}
                          style={{
                            padding: '4px 8px',
                            background: 'none',
                            border: 'none',
                            cursor: !entry.password ? 'not-allowed' : 'pointer',
                            fontSize: '16px',
                            opacity: !entry.password ? 0.4 : 1
                          }}
                          title={!entry.password ? 'Enter a password first' : 'Lock (encrypt)'}
                        >
                          🔑
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Link */}
                  <td style={{ padding: '4px 6px', border: '1px solid #ddd', textAlign: 'center' }}>
                    {entry.linkUrl ? (
                      <a href={entry.linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', marginRight: '4px', fontSize: '12px' }}>
                        link
                      </a>
                    ) : (
                      <span style={{ color: '#ccc', marginRight: '4px', fontSize: '12px' }}>-</span>
                    )}
                    <button
                      onClick={() => openLinkModal(entry.id)}
                      style={{ padding: '2px 4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                      title="Edit link"
                    >
                      ✎
                    </button>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '4px 6px', border: '1px solid #ddd', textAlign: 'center' }}>
                    {entry.state === PasswordState.ENCRYPTED && <span title="Encrypted" style={{ fontSize: '16px' }}>🔒</span>}
                    {entry.state === PasswordState.DECRYPTED && <span title="Decrypted" style={{ fontSize: '16px' }}>🔑</span>}
                    {entry.state === PasswordState.MODIFIED_DECRYPTED && <span title="Modified" style={{ color: '#ffc107', fontSize: '16px' }}>✎</span>}
                    {entry.state === PasswordState.NEW && <span title="New" style={{ color: '#17a2b8', fontSize: '16px' }}>✚</span>}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '4px 6px', border: '1px solid #ddd' }}>
                    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleSave(entry.id)}
                        disabled={loading || !needsSave(entry)}
                        style={{
                          padding: '4px 8px',
                          background: 'none',
                          border: 'none',
                          cursor: needsSave(entry) ? 'pointer' : 'not-allowed',
                          fontSize: '16px',
                          opacity: needsSave(entry) ? 1 : 0.3
                        }}
                        title={entry._pendingSaveEncrypted ? "Save encrypted changes" : "Save and encrypt"}
                      >
                        💾
                      </button>
                      <button
                        onClick={() => setDeleteModal({ isOpen: true, passwordId: entry.id, description: entry.description || 'this password' })}
                        disabled={loading || entry.isNew()}
                        style={{
                          padding: '4px 8px',
                          background: 'none',
                          border: 'none',
                          cursor: entry.isNew() ? 'not-allowed' : 'pointer',
                          fontSize: '16px',
                          opacity: entry.isNew() ? 0.3 : 1
                        }}
                        title="Delete password"
                      >
                        🗑
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
              <li><strong>View Password:</strong> Click "Decrypt" on the password you want to view</li>
              <li><strong>Copy Password:</strong> Click "Copy" to copy the password to your clipboard (works on encrypted passwords too)</li>
              <li><strong>Lock Password:</strong> Click "Lock" to re-encrypt the password after viewing</li>
              <li><strong>Add Link:</strong> Click "Edit" in the Link column to add a URL associated with this password</li>
              <li><strong>Filter:</strong> Use the filter box to search by description</li>
            </ol>
          </div>
        </>
      )}

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
      <LinkEditModal
        isOpen={linkModal.isOpen}
        linkUrl={linkModal.linkUrl}
        onLinkUrlChange={(url) => setLinkModal({ ...linkModal, linkUrl: url })}
        onSave={saveLinkModal}
        onClose={() => setLinkModal({ isOpen: false, passwordId: null, linkUrl: '' })}
      />

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

      {/* Import CSV Modal */}
      {showImportModal && (
        <ImportCSVModal
          masterPassword={masterPassword}
          onClose={() => setShowImportModal(false)}
          onImportComplete={loadPasswords}
          setError={setError}
        />
      )}

      {/* Add Password Modal */}
      <AddPasswordModal
        isOpen={showAddModal}
        masterPassword={masterPassword}
        onSave={handleAddPasswordSave}
        onClose={() => setShowAddModal(false)}
      />

      {/* Verify Results Modal */}
      {verifyResult && verifyResult !== 'checking' && (
        <VerifyResultsModal
          result={verifyResult}
          onClose={() => setVerifyResult(null)}
        />
      )}
    </div>
  );
};

export default PasswordVault;
