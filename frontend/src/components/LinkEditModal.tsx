// @ts-nocheck
import React from 'react';

interface LinkEditModalProps {
  isOpen: boolean;
  linkUrl: string;
  onLinkUrlChange: (url: string) => void;
  onSave: () => void;
  onClose: () => void;
}

const LinkEditModal: React.FC<LinkEditModalProps> = ({ isOpen, linkUrl, onLinkUrlChange, onSave, onClose }) => {
  if (!isOpen) return null;

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
                  value={linkUrl}
                  onChange={(e) => onLinkUrlChange(e.target.value)}
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
            onClick={onClose}
            style={{ padding: '10px 20px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            style={{ padding: '10px 20px', border: 'none', borderRadius: '4px', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkEditModal;
