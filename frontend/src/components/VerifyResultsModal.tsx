// @ts-nocheck
import React from 'react';

interface VerifyResult {
  passed: string[];
  failed: string[];
  total: number;
}

interface VerifyResultsModalProps {
  result: VerifyResult;
  onClose: () => void;
}

const VerifyResultsModal: React.FC<VerifyResultsModalProps> = ({ result, onClose }) => {
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
        minWidth: '400px',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <h3 style={{ marginTop: 0 }}>
          Verification Results
          {result.failed.length === 0 ? ' ✓' : ' ⚠'}
        </h3>
        <div style={{
          padding: '15px',
          marginBottom: '15px',
          backgroundColor: result.failed.length === 0 ? '#d4edda' : '#f8d7da',
          border: `1px solid ${result.failed.length === 0 ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          <strong>{result.passed.length}</strong> of <strong>{result.total}</strong> encrypted passwords verified successfully.
        </div>

        {result.failed.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <strong style={{ color: '#721c24' }}>Failed to decrypt ({result.failed.length}):</strong>
            <ul style={{ margin: '10px 0', paddingLeft: '20px', maxHeight: '200px', overflow: 'auto' }}>
              {result.failed.map((desc, i) => (
                <li key={i} style={{ color: '#721c24' }}>{desc}</li>
              ))}
            </ul>
            <p style={{ fontSize: '12px', color: '#666', margin: '10px 0 0 0' }}>
              These records may be corrupted or encrypted with a different master password.
            </p>
          </div>
        )}

        {result.failed.length === 0 && (
          <p style={{ color: '#155724', margin: '0 0 15px 0' }}>
            All encrypted passwords can be decrypted with the current master password.
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 20px', border: 'none', borderRadius: '4px', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyResultsModal;
