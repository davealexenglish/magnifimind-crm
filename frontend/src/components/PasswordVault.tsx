// @ts-nocheck
/**
 * Password Vault Component
 *
 * Client-side password vault with encryption/decryption
 */

import React, { useState, useEffect } from 'react';
import { PasswordEntry, PasswordCollection, PasswordState } from '../utils/passwordStateManager';
import ConfirmationModal from './ConfirmationModal';

const PasswordVault = () => {
  const [passwords] = useState(new PasswordCollection());
  const [version, setVersion] = useState(0);
  const [masterPassword, setMasterPassword] = useState('');
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, passwordId: null, description: '' });

  useEffect(() => {
    loadPasswords();
  }, []);

  const loadPasswords = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/passwords', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
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

  const handleLock = (passwordId) => {
    const entry = passwords.get(passwordId);
    if (entry) {
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
    if (!masterPassword) {
      setError('Please enter master password to save');
      return;
    }
    const entry = passwords.get(passwordId);
    if (!entry) {
      console.error('Entry not found for ID:', passwordId);
      return;
    }
    const wasNew = entry.isNew();
    const tempId = passwordId;

    setLoading(true);
    try {
      const payload = await entry.prepareForSave(masterPassword);
      // For new entries, don't include ID in URL (even temporary IDs like "new-123")
      const url = wasNew ? '/api/v1/passwords' : `/api/v1/passwords/${entry.id}`;
      const method = wasNew ? 'POST' : 'PUT';
      console.log('Saving password:', { url, method, payload: { ...payload, password: '[ENCRYPTED]' } });
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
      const response = await fetch(`/api/v1/passwords/${passwordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
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
      password: ''
    });
    passwords.add(newEntry);
    setVersion(v => v + 1);
  };

  const stateCounts = passwords.getStateCounts();

  return (
    <div className="password-vault" style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>Password Vault</h1>

      {/* Master Password Section */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
        <h3>Master Password</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <input
            type={showMasterPassword ? 'text' : 'password'}
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            placeholder="Enter master password"
            autoComplete="new-password"
            data-form-type="other"
            name={`master-pwd-${Math.random()}`}
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
        ➕ Add New Password
      </button>

      {/* Password List Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Username</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left', minWidth: '200px' }}>Password</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {passwords.getAll().length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  No passwords saved. Click "Add New Password" to create one.
                </td>
              </tr>
            ) : (
              passwords.getAll().map((entry, index) => (
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
                      style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '3px' }}
                      placeholder="Username"
                    />
                  </td>

                  {/* Password */}
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <input
                        type={entry.isEncrypted() ? 'password' : 'text'}
                        value={entry.password || ''}
                        onChange={(e) => {
                          entry.updatePassword(e.target.value);
                          setVersion(v => v + 1);
                        }}
                        disabled={entry.isEncrypted()}
                        style={{
                          flex: '1',
                          padding: '6px',
                          border: '1px solid #ccc',
                          borderRadius: '3px',
                          backgroundColor: entry.isEncrypted() ? '#f5f5f5' : 'white'
                        }}
                        placeholder={entry.isEncrypted() ? '••••••••••' : 'Password'}
                      />
                      {entry.isEncrypted() ? (
                        <button
                          onClick={() => handleDecrypt(entry.id)}
                          disabled={!masterPassword}
                          style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}
                          title="Decrypt password"
                        >
                          🔓 Decrypt
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => copyToClipboard(entry.password, entry.description)}
                            style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}
                            title="Copy to clipboard"
                          >
                            📋 Copy
                          </button>
                          <button
                            onClick={() => handleLock(entry.id)}
                            disabled={entry.isNew()}
                            style={{
                              padding: '6px 12px',
                              whiteSpace: 'nowrap',
                              cursor: entry.isNew() ? 'not-allowed' : 'pointer',
                              opacity: entry.isNew() ? 0.5 : 1
                            }}
                            title={entry.isNew() ? 'Cannot lock unsaved password' : 'Lock (re-encrypt)'}
                          >
                            🔒 Lock
                          </button>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                    {entry.state === PasswordState.ENCRYPTED && <span style={{ color: '#666' }}>🔒 Encrypted</span>}
                    {entry.state === PasswordState.DECRYPTED && <span style={{ color: '#28a745' }}>🔓 Decrypted</span>}
                    {entry.state === PasswordState.MODIFIED_DECRYPTED && <span style={{ color: '#ffc107' }}>✏️ Modified</span>}
                    {entry.state === PasswordState.NEW && <span style={{ color: '#17a2b8' }}>➕ New</span>}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleSave(entry.id)}
                        disabled={loading || (!entry.isNew() && !entry.isModified())}
                        style={{
                          padding: '6px 12px',
                          whiteSpace: 'nowrap',
                          backgroundColor: (entry.isNew() || entry.isModified()) ? '#28a745' : '#ccc',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: (entry.isNew() || entry.isModified()) ? 'pointer' : 'not-allowed'
                        }}
                        title="Save and encrypt"
                      >
                        💾 Save
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
                        🗑️ Delete
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
          <li><strong>Save encrypts once:</strong> When you save, the password is encrypted exactly once before being sent to the database</li>
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
    </div>
  );
};

export default PasswordVault;
