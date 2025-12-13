// @ts-nocheck
import React, { useState } from 'react';
import { apiFetch } from '../utils/api';

interface ImportCSVModalProps {
  masterPassword: string;
  onClose: () => void;
  onImportComplete: () => void;
  setError: (error: string | null) => void;
}

const ImportCSVModal: React.FC<ImportCSVModalProps> = ({ masterPassword, onClose, onImportComplete, setError }) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [hasHeaders, setHasHeaders] = useState(false);
  const [colDescription, setColDescription] = useState(2);
  const [colUsername, setColUsername] = useState(3);
  const [colPassword, setColPassword] = useState(4);
  const [colLink, setColLink] = useState(6);

  const parseCSV = (text: string) => {
    let lines = text.split('\n').filter(line => line.trim());
    if (hasHeaders && lines.length > 0) {
      lines = lines.slice(1);
    }
    const results = [];
    const descIdx = colDescription - 1;
    const userIdx = colUsername - 1;
    const passIdx = colPassword - 1;
    const linkIdx = colLink ? colLink - 1 : -1;

    for (const line of lines) {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
    }
  };

  const startImport = async () => {
    if (!file) {
      setError('Please select a CSV file');
      return;
    }
    if (!masterPassword) {
      setError('Please enter master password to encrypt imported passwords');
      return;
    }

    setImporting(true);
    setProgress(0);
    setResults(null);
    setError(null);

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setTotal(parsed.length);

      const { encryptPassword } = await import('../utils/passwordEncryption');
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i];
        try {
          const encryptedPassword = await encryptPassword(row.password, masterPassword);
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
        } catch (err: any) {
          failed++;
          errors.push(`Row ${i + 1} (${row.description}): ${err.message}`);
        }
        setProgress(i + 1);
      }

      setResults({ success, failed, errors });
      if (success > 0) {
        onImportComplete();
      }
    } catch (err: any) {
      setError('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    setProgress(0);
    setTotal(0);
    onClose();
  };

  return (
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

        {!results ? (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>CSV File:</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={importing}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={hasHeaders}
                  onChange={(e) => setHasHeaders(e.target.checked)}
                  disabled={importing}
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
                    value={colDescription}
                    onChange={(e) => setColDescription(parseInt(e.target.value) || 1)}
                    disabled={importing}
                    style={{ width: '60px', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Username:</label>
                  <input
                    type="number"
                    min="1"
                    value={colUsername}
                    onChange={(e) => setColUsername(parseInt(e.target.value) || 1)}
                    disabled={importing}
                    style={{ width: '60px', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Password:</label>
                  <input
                    type="number"
                    min="1"
                    value={colPassword}
                    onChange={(e) => setColPassword(parseInt(e.target.value) || 1)}
                    disabled={importing}
                    style={{ width: '60px', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Link (optional):</label>
                  <input
                    type="number"
                    min="0"
                    value={colLink}
                    onChange={(e) => setColLink(parseInt(e.target.value) || 0)}
                    disabled={importing}
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

            {importing && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '8px' }}>
                  Importing... {progress} / {total}
                </div>
                <div style={{ width: '100%', height: '20px', backgroundColor: '#e0e0e0', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${total > 0 ? (progress / total) * 100 : 0}%`,
                    height: '100%',
                    backgroundColor: '#28a745',
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleClose}
                disabled={importing}
                style={{ padding: '10px 20px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={startImport}
                disabled={importing || !file || !masterPassword}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: (!file || !masterPassword) ? '#ccc' : '#007bff',
                  color: 'white',
                  cursor: (!file || !masterPassword) ? 'not-allowed' : 'pointer'
                }}
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                padding: '15px',
                backgroundColor: results.failed === 0 ? '#d4edda' : '#fff3cd',
                border: `1px solid ${results.failed === 0 ? '#c3e6cb' : '#ffc107'}`,
                borderRadius: '4px',
                marginBottom: '15px'
              }}>
                <strong>Import Complete:</strong> {results.success} succeeded, {results.failed} failed
              </div>
              {results.errors.length > 0 && (
                <div style={{ maxHeight: '200px', overflow: 'auto', fontSize: '12px', color: '#721c24' }}>
                  <strong>Errors:</strong>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    {results.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleClose}
                style={{ padding: '10px 20px', border: 'none', borderRadius: '4px', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImportCSVModal;
