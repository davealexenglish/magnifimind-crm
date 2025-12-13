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
  const [importModal, setImportModal] = useState({
    isOpen: false,
    file: null,
    importing: false,
    progress: 0,
    total: 0,
    results: null,
    hasHeaders: false,
    colDescription: 2,
    colUsername: 3,
    colPassword: 4,
    colLink: 6
  });

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

  // CSV Import functions
  const parseCSV = (text, hasHeaders, colDesc, colUser, colPass, colLink) => {
    let lines = text.split('\n').filter(line => line.trim());
    // Skip header row if specified
    if (hasHeaders && lines.length > 0) {
      lines = lines.slice(1);
    }
    const results = [];
    // Convert 1-based column positions to 0-based indices
    const descIdx = colDesc - 1;
    const userIdx = colUser - 1;
    const passIdx = colPass - 1;
    const linkIdx = colLink ? colLink - 1 : -1;

    for (const line of lines) {
      // Simple CSV parsing (handles basic cases)
      const cols = line.split(',');
      const minCols = Math.max(descIdx, userIdx, passIdx) + 1;
      if (cols.length >= minCols) {
        results.push({
          description: cols[descIdx]?.trim() || '',
          username: cols[userIdx]?.trim() || '',
          password: cols[passIdx]?.trim() || '',
          link: linkIdx >= 0 && cols[linkIdx] ? cols[linkIdx].trim() : ''
        });
      }
    }
    return results;
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImportModal({ ...importModal, file, results: null });
    }
  };

  const startImport = async () => {
    if (!importModal.file) {
      setError('Please select a CSV file');
      return;
    }
    if (!masterPassword) {
      setError('Please enter master password to encrypt imported passwords');
      return;
    }

    setImportModal(prev => ({ ...prev, importing: true, progress: 0, results: null }));
    setError(null);

    try {
      const text = await importModal.file.text();
      const parsed = parseCSV(
        text,
        importModal.hasHeaders,
        importModal.colDescription,
        importModal.colUsername,
        importModal.colPassword,
        importModal.colLink
      );
      const total = parsed.length;
      setImportModal(prev => ({ ...prev, total }));

      const { encryptPassword } = await import('../utils/passwordEncryption');
      let success = 0;
      let failed = 0;
      const errors = [];

      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i];
        try {
          // Encrypt the password
          const encryptedPassword = await encryptPassword(row.password, masterPassword);

          // Save to API
          const payload = {
            description: row.description,
            name: row.username,
            password: encryptedPassword,
            linkUrl: row.link || null
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

          success++;
        } catch (err) {
          failed++;
          errors.push(`Row ${i + 1} (${row.description}): ${err.message}`);
        }

        setImportModal(prev => ({ ...prev, progress: i + 1 }));
      }

      setImportModal(prev => ({
        ...prev,
        importing: false,
        results: { success, failed, errors }
      }));

      // Reload passwords to show new entries
      if (success > 0) {
        await loadPasswords();
      }

    } catch (err) {
      setError('Import failed: ' + err.message);
      setImportModal(prev => ({ ...prev, importing: false }));
    }
  };

  const closeImportModal = () => {
    setImportModal({
      isOpen: false,
      file: null,
      importing: false,
      progress: 0,
      total: 0,
      results: null,
      hasHeaders: false,
      colDescription: 2,
      colUsername: 3,
      colPassword: 4,
      colLink: 6
    });
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
          <button onClick={handleDecryptAll} disabled={!masterPassword || loading} style={{ padding: '6px 12px', backgroundColor: !masterPassword || loading ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: !masterPassword || loading ? 'not-allowed' : 'pointer' }}>
            🔓 Decrypt All
          </button>
          <button onClick={handleLockAll} style={{ padding: '6px 12px', backgroundColor: '#ffc107', color: '#212529', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
            🔒 Lock All
          </button>
          <button onClick={() => setMasterPassword('')} style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
            Clear
          </button>
          <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#666' }}>
            Total: {passwords.getAll().length} | 🔒 {stateCounts[PasswordState.ENCRYPTED]} | 🔓 {stateCounts[PasswordState.DECRYPTED]} | ✎ {stateCounts[PasswordState.MODIFIED_DECRYPTED]} | ✚ {stateCounts[PasswordState.NEW]}
          </span>
        </div>
        <small style={{ color: '#888', fontSize: '11px' }}>
          Master password is NEVER sent to the server. Encryption/decryption happens in your browser only.
        </small>
      </div>

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
          <button onClick={addNewPassword} style={{ padding: '6px 14px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
            ✚ Add New
          </button>
          <button onClick={() => setImportModal({ ...importModal, isOpen: true })} style={{ padding: '6px 14px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
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
      {copySuccess && (
        <div style={{ padding: '8px 12px', marginBottom: '10px', backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', borderRadius: '4px', fontSize: '13px' }}>
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
                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px', fontSize: '13px' }}
                      placeholder="Description"
                    />
                  </td>

                  {/* Username */}
                  <td style={{ padding: '4px 6px', border: '1px solid #ddd' }}>
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
                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px', fontSize: '13px' }}
                      placeholder="Username"
                    />
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
                        <>
                          <button
                            onClick={() => copyToClipboard(entry.password, entry.description)}
                            style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                            title="Copy to clipboard"
                          >
                            📋
                          </button>
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
                        </>
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

      {/* Import CSV Modal */}
      {importModal.isOpen && (
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
            <h3 style={{ marginTop: 0 }}>Import Passwords from CSV</h3>

            {!importModal.results ? (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>CSV File:</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportFile}
                    disabled={importModal.importing}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={importModal.hasHeaders}
                      onChange={(e) => setImportModal({ ...importModal, hasHeaders: e.target.checked })}
                      disabled={importModal.importing}
                    />
                    <span>First row contains headers (skip it)</span>
                  </label>
                </div>

                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>Column Positions (1-based):</p>
                  <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#666' }}>
                    Enter the column number for each field. Column 1 is the first column. Leave Link blank or 0 if not present.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Description:</label>
                      <input
                        type="number"
                        min="1"
                        value={importModal.colDescription}
                        onChange={(e) => setImportModal({ ...importModal, colDescription: parseInt(e.target.value) || 1 })}
                        disabled={importModal.importing}
                        style={{ width: '60px', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Username:</label>
                      <input
                        type="number"
                        min="1"
                        value={importModal.colUsername}
                        onChange={(e) => setImportModal({ ...importModal, colUsername: parseInt(e.target.value) || 1 })}
                        disabled={importModal.importing}
                        style={{ width: '60px', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Password:</label>
                      <input
                        type="number"
                        min="1"
                        value={importModal.colPassword}
                        onChange={(e) => setImportModal({ ...importModal, colPassword: parseInt(e.target.value) || 1 })}
                        disabled={importModal.importing}
                        style={{ width: '60px', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Link (optional):</label>
                      <input
                        type="number"
                        min="0"
                        value={importModal.colLink}
                        onChange={(e) => setImportModal({ ...importModal, colLink: parseInt(e.target.value) || 0 })}
                        disabled={importModal.importing}
                        style={{ width: '60px', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                  </div>
                </div>

                {!masterPassword && (
                  <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
                    Enter your master password above before importing.
                  </div>
                )}

                {importModal.importing && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      Importing... {importModal.progress} / {importModal.total}
                    </div>
                    <div style={{ width: '100%', height: '20px', backgroundColor: '#e0e0e0', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${importModal.total > 0 ? (importModal.progress / importModal.total) * 100 : 0}%`,
                        height: '100%',
                        backgroundColor: '#28a745',
                        transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={closeImportModal}
                    disabled={importModal.importing}
                    style={{ padding: '10px 20px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={startImport}
                    disabled={importModal.importing || !importModal.file || !masterPassword}
                    style={{
                      padding: '10px 20px',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: (!importModal.file || !masterPassword) ? '#ccc' : '#007bff',
                      color: 'white',
                      cursor: (!importModal.file || !masterPassword) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {importModal.importing ? 'Importing...' : 'Import'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    padding: '15px',
                    backgroundColor: importModal.results.failed === 0 ? '#d4edda' : '#fff3cd',
                    border: `1px solid ${importModal.results.failed === 0 ? '#c3e6cb' : '#ffc107'}`,
                    borderRadius: '4px',
                    marginBottom: '15px'
                  }}>
                    <strong>Import Complete:</strong> {importModal.results.success} succeeded, {importModal.results.failed} failed
                  </div>
                  {importModal.results.errors.length > 0 && (
                    <div style={{ maxHeight: '200px', overflow: 'auto', fontSize: '12px', color: '#721c24' }}>
                      <strong>Errors:</strong>
                      <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                        {importModal.results.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={closeImportModal}
                    style={{ padding: '10px 20px', border: 'none', borderRadius: '4px', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordVault;
