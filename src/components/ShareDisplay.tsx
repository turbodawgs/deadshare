import { useState, useCallback } from 'react';
import { EncryptionResult, KeyShare } from '../types';
import { ShamirUtils } from '../utils/shamir';
import { ExportUtils, ExportOptions } from '../utils/export';
import { QRCodeDisplay } from './QRCodeDisplay';
import './ShareDisplay.css';

interface ShareDisplayProps {
  result: EncryptionResult;
  onReset: () => void;
}

export const ShareDisplay: React.FC<ShareDisplayProps> = ({ result, onReset }) => {
  const [selectedShares, setSelectedShares] = useState<Set<number>>(new Set());
  const [showQRCodes, setShowQRCodes] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeEncryptedFile: true,
    includeQRCodes: true,
    includeReadme: true,
  });
  const [isCreatingBundle, setIsCreatingBundle] = useState(false);

  const downloadEncryptedFile = useCallback(() => {
    try {
      // Create a complete encrypted file with IV prepended
      const ivArray = result.encryptedFile.iv;
      const encryptedArray = new Uint8Array(result.encryptedFile.encryptedData);
      
      // Combine IV + encrypted data
      const completeFile = new Uint8Array(ivArray.length + encryptedArray.length);
      completeFile.set(ivArray, 0);
      completeFile.set(encryptedArray, ivArray.length);
      
      const blob = new Blob([completeFile], {
        type: 'application/octet-stream'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.encryptedFile.filename}.encrypted`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download encrypted file:', error);
    }
  }, [result.encryptedFile]);

  const downloadShare = useCallback((share: KeyShare) => {
    try {
      const blob = ShamirUtils.createShareFile(share);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deadshare-key-share-${share.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download share:', error);
    }
  }, []);

  const downloadSelectedShares = useCallback(() => {
    selectedShares.forEach(shareId => {
      const share = result.keyShares.find(s => s.id === shareId);
      if (share) {
        downloadShare(share);
      }
    });
  }, [selectedShares, result.keyShares, downloadShare]);

  const downloadAllShares = useCallback(() => {
    result.keyShares.forEach(share => {
      downloadShare(share);
    });
  }, [result.keyShares, downloadShare]);

  const toggleShareSelection = (shareId: number) => {
    setSelectedShares(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shareId)) {
        newSet.delete(shareId);
      } else {
        newSet.add(shareId);
      }
      return newSet;
    });
  };

  const selectAllShares = () => {
    setSelectedShares(new Set(result.keyShares.map(s => s.id)));
  };

  const clearSelection = () => {
    setSelectedShares(new Set());
  };

  const copyShareToClipboard = async (share: KeyShare) => {
    try {
      const shareData = JSON.stringify({
        id: share.id,
        share: ShamirUtils.shareToBase64(share.share),
        application: 'DeadShare',
        filename: result.encryptedFile.filename,
        format: 'base64'
      }, null, 2);
      
      await navigator.clipboard.writeText(shareData);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy share to clipboard:', error);
    }
  };

  const createSecureBundle = useCallback(async () => {
    setIsCreatingBundle(true);
    try {
      const bundle = await ExportUtils.createSecureBundle(result, exportOptions);
      const filename = `deadshare-bundle-${result.encryptedFile.filename}-${new Date().toISOString().split('T')[0]}.zip`;
      ExportUtils.downloadBlob(bundle, filename);
    } catch (error) {
      console.error('Failed to create secure bundle:', error);
    } finally {
      setIsCreatingBundle(false);
      setShowExportOptions(false);
    }
  }, [result, exportOptions]);


  const toggleExportOption = (option: keyof ExportOptions) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: !prev[option],
    }));
  };

  return (
    <div className="share-display">
      <div className="header-section">
        <h2>🎉 Encryption Complete!</h2>
        <p className="success-message">
          Your file <strong>{result.encryptedFile.filename}</strong> has been encrypted and 
          split into {result.keyShares.length} key shares. You need at least{' '}
          <strong>{result.config.threshold}</strong> shares to decrypt the file.
        </p>
      </div>

      <div className="download-section">
        <h3>📁 Download Encrypted File</h3>
        <div className="encrypted-file-info">
          <div className="file-details">
            <div className="file-name">{result.encryptedFile.filename}.encrypted</div>
            <div className="file-size">
              {(result.encryptedFile.encryptedData.byteLength / (1024 * 1024)).toFixed(2)} MB
            </div>
          </div>
          <button onClick={downloadEncryptedFile} className="download-button primary">
            📥 Download Encrypted File
          </button>
        </div>
      </div>

      <div className="shares-section">
        <div className="shares-header">
          <h3>🔑 Key Shares</h3>
          <div className="shares-actions">
            <label className="toggle-container">
              <input
                type="checkbox"
                checked={showQRCodes}
                onChange={(e) => setShowQRCodes(e.target.checked)}
              />
              Show QR Codes
            </label>
          </div>
        </div>

        <div className="selection-controls">
          <span className="selection-info">
            {selectedShares.size} of {result.keyShares.length} shares selected
          </span>
          <div className="selection-buttons">
            <button onClick={selectAllShares} className="select-button">
              Select All
            </button>
            <button onClick={clearSelection} className="select-button">
              Clear
            </button>
            {selectedShares.size > 0 && (
              <button onClick={downloadSelectedShares} className="download-button">
                📥 Download Selected ({selectedShares.size})
              </button>
            )}
          </div>
        </div>

        <div className="shares-grid">
          {result.keyShares.map(share => (
            <div
              key={share.id}
              className={`share-card ${selectedShares.has(share.id) ? 'selected' : ''}`}
            >
              <div className="share-header">
                <div className="share-id">Share #{share.id}</div>
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={selectedShares.has(share.id)}
                    onChange={() => toggleShareSelection(share.id)}
                  />
                  <span className="checkmark"></span>
                </label>
              </div>

              {showQRCodes && (
                <QRCodeDisplay share={share} className="share-qr-code" />
              )}

              <div className="share-data">
                <div className="share-preview">
                  {ShamirUtils.shareToBase64(share.share).substring(0, 20)}...
                </div>
              </div>

              <div className="share-actions">
                <button
                  onClick={() => downloadShare(share)}
                  className="action-button download"
                  title="Download this share"
                >
                  📥
                </button>
                <button
                  onClick={() => copyShareToClipboard(share)}
                  className="action-button copy"
                  title="Copy share to clipboard"
                >
                  📋
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bulk-actions">
          <button onClick={downloadAllShares} className="download-button secondary">
            📥 Download All Shares
          </button>
          <button 
            onClick={() => setShowExportOptions(!showExportOptions)} 
            className="download-button primary"
          >
            📦 Create Secure Bundle
          </button>
        </div>

        {showExportOptions && (
          <div className="export-options">
            <h4>Bundle Options</h4>
            <div className="options-grid">
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={exportOptions.includeEncryptedFile}
                  onChange={() => toggleExportOption('includeEncryptedFile')}
                />
                Include encrypted file
              </label>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={exportOptions.includeQRCodes}
                  onChange={() => toggleExportOption('includeQRCodes')}
                />
                Include QR codes
              </label>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={exportOptions.includeReadme}
                  onChange={() => toggleExportOption('includeReadme')}
                />
                Include instructions
              </label>
            </div>
            <div className="export-actions">
              <button 
                onClick={createSecureBundle} 
                disabled={isCreatingBundle}
                className="create-bundle-button"
              >
                {isCreatingBundle ? (
                  <>
                    <span className="loading-spinner"></span>
                    Creating Bundle...
                  </>
                ) : (
                  '📦 Create ZIP Bundle'
                )}
              </button>
              <button 
                onClick={() => setShowExportOptions(false)}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="security-warning">
        <div className="warning-icon">WARNING:</div>
        <div className="warning-content">
          <strong>Security Reminder:</strong>
          <ul>
            <li>Store shares in different secure locations</li>
            <li>Don't share more than {result.config.threshold - 1} shares with the same person</li>
            <li>Keep the encrypted file separate from the key shares</li>
            <li>Anyone with {result.config.threshold}+ shares can decrypt your file</li>
          </ul>
        </div>
      </div>

      <div className="reset-section">
        <button onClick={onReset} className="reset-button">
          🔄 Encrypt Another File
        </button>
      </div>

    </div>
  );
};