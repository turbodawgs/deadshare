import { useState, useRef, useEffect } from 'react';
import { EncryptedFile, KeyShare } from '../types';
import { EncryptionUtils } from '../utils/encryption';
import { ShamirUtils } from '../utils/shamir';
import { ReleaseUtils } from '../utils/releaseUtils';
import { STORAGE_KEYS } from '../types/releaseOptions';

interface DecryptHandlerProps {
  onError: (error: string) => void;
}

interface DecryptState {
  encryptedFile: File | null;
  keyShares: File[];
  isDecrypting: boolean;
  decryptedFile: { name: string; data: ArrayBuffer } | null;
  releaseStatus: {
    canDecrypt: boolean;
    timeRemaining?: number;
    viewsRemaining?: number;
    warningMessage?: string;
    releaseType?: string;
  };
}

export function DecryptHandler({ onError }: DecryptHandlerProps) {
  const [state, setState] = useState<DecryptState>({
    encryptedFile: null,
    keyShares: [],
    isDecrypting: false,
    decryptedFile: null,
    releaseStatus: { canDecrypt: true },
  });

  // Check release options on component mount and periodically
  useEffect(() => {
    checkReleaseOptions();
    const interval = setInterval(checkReleaseOptions, 1000); // Check every second
    return () => clearInterval(interval);
  }, []);

  const checkReleaseOptions = () => {
    // Check timed release
    const timedCheck = ReleaseUtils.checkTimedRelease();
    if (!timedCheck.canDecrypt) {
      setState(prev => ({
        ...prev,
        releaseStatus: {
          canDecrypt: false,
          timeRemaining: timedCheck.timeRemaining,
          releaseType: 'timed',
          warningMessage: 'File is under timed release restriction'
        }
      }));
      return;
    }

    // Check burn after read
    const burnCheck = ReleaseUtils.checkBurnState();
    if (!burnCheck.canView) {
      setState(prev => ({
        ...prev,
        releaseStatus: {
          canDecrypt: false,
          releaseType: 'burn-after-read',
          warningMessage: burnCheck.warningMessage || 'File has been burned and is no longer available'
        }
      }));
      return;
    }

    if (burnCheck.viewsRemaining !== undefined) {
      setState(prev => ({
        ...prev,
        releaseStatus: {
          canDecrypt: true,
          viewsRemaining: burnCheck.viewsRemaining,
          releaseType: 'burn-after-read',
          warningMessage: burnCheck.warningMessage
        }
      }));
      return;
    }

    // Check designated session
    const releaseConfig = localStorage.getItem(STORAGE_KEYS.RELEASE_CONFIG);
    if (releaseConfig) {
      try {
        const config = JSON.parse(releaseConfig);
        if (config.type === 'designated') {
          const hasAccess = ReleaseUtils.checkDesignatedAccess(config.designatedSessionId);
          if (!hasAccess) {
            setState(prev => ({
              ...prev,
              releaseStatus: {
                canDecrypt: false,
                releaseType: 'designated',
                warningMessage: 'This session is not authorized to decrypt this file'
              }
            }));
            return;
          }
        }
      } catch (error) {
        // Ignore invalid config
      }
    }

    // Default: allow decryption
    setState(prev => ({
      ...prev,
      releaseStatus: { canDecrypt: true }
    }));
  };

  const encryptedFileRef = useRef<HTMLInputElement>(null);
  const keySharesRef = useRef<HTMLInputElement>(null);

  const handleEncryptedFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file extension
      const isEncryptedFile = file.name.endsWith('.encrypted');
      const isJsonFile = file.name.endsWith('.json') && file.name.includes('encrypted-');
      
      if (!isEncryptedFile && !isJsonFile) {
        onError('Please select a valid encrypted file (.encrypted) or exported encrypted file (.json)');
        if (encryptedFileRef.current) encryptedFileRef.current.value = '';
        return;
      }
      
      setState(prev => ({ ...prev, encryptedFile: file }));
    }
  };

  const handleKeySharesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate all files are JSON key shares
    const invalidFiles = files.filter(file => !file.name.endsWith('.json'));
    if (invalidFiles.length > 0) {
      onError(`Invalid key share files: ${invalidFiles.map(f => f.name).join(', ')}. Only .json files are accepted.`);
      if (keySharesRef.current) keySharesRef.current.value = '';
      return;
    }
    
    setState(prev => ({ ...prev, keyShares: files }));
  };

  const parseEncryptedFile = async (file: File): Promise<EncryptedFile> => {
    try {
      const isJsonFormat = file.name.endsWith('.json');
      
      if (isJsonFormat) {
        // Handle JSON format (from ZIP exports)
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!data.encryptedData || !data.iv || !data.filename) {
          throw new Error('Invalid JSON encrypted file format - missing required fields');
        }

        return {
          encryptedData: EncryptionUtils.hexToBuffer(data.encryptedData),
          iv: new Uint8Array(data.iv),
          filename: data.filename,
          originalSize: data.originalSize || 0,
        };
      } else {
        // Handle .encrypted format (raw binary)
        const arrayBuffer = await file.arrayBuffer();
        
        // For .encrypted files, we need to extract metadata
        // The filename is embedded in the original file name (remove .encrypted extension)
        const originalFilename = file.name.replace(/\.encrypted$/, '');
        
        // For raw encrypted files, we need to read the IV from the beginning
        // The format should be: [12-byte IV][encrypted data]
        if (arrayBuffer.byteLength < 12) {
          throw new Error('Invalid encrypted file - file too small to contain IV');
        }
        
        const iv = new Uint8Array(arrayBuffer.slice(0, 12));
        const encryptedData = arrayBuffer.slice(12);
        
        return {
          encryptedData,
          iv,
          filename: originalFilename,
          originalSize: encryptedData.byteLength,
        };
      }
    } catch (error) {
      throw new Error(`Failed to parse encrypted file: ${error}`);
    }
  };

  const handleDecrypt = async () => {
    if (!state.encryptedFile || state.keyShares.length < 2) {
      onError('Please select an encrypted file and at least 2 key shares');
      return;
    }

    // Check release options before decrypting
    if (!state.releaseStatus.canDecrypt) {
      onError(state.releaseStatus.warningMessage || 'Decryption not allowed due to release restrictions');
      return;
    }

    setState(prev => ({ ...prev, isDecrypting: true }));

    try {
      const encryptedFileData = await parseEncryptedFile(state.encryptedFile);
      
      const keySharesData: KeyShare[] = [];
      for (const shareFile of state.keyShares) {
        const share = await ShamirUtils.parseShareFile(shareFile);
        keySharesData.push(share);
      }

      if (!ShamirUtils.validateShares(keySharesData)) {
        throw new Error('Invalid key shares provided');
      }

      const reconstructedKey = await ShamirUtils.reconstructKey(keySharesData);
      const decryptedData = await EncryptionUtils.decryptFile(encryptedFileData, reconstructedKey);

      // Record view for burn-after-read
      if (state.releaseStatus.releaseType === 'burn-after-read') {
        ReleaseUtils.recordView();
      }

      setState(prev => ({
        ...prev,
        isDecrypting: false,
        decryptedFile: {
          name: encryptedFileData.filename,
          data: decryptedData,
        },
      }));
    } catch (error) {
      setState(prev => ({ ...prev, isDecrypting: false }));
      onError(`Decryption failed: ${error}`);
    }
  };

  const downloadDecryptedFile = () => {
    if (!state.decryptedFile) return;

    // Record download for burn-after-read
    if (state.releaseStatus.releaseType === 'burn-after-read') {
      const wasBurned = ReleaseUtils.recordDownload();
      if (wasBurned) {
        // File was burned, clear the state
        setState(prev => ({
          ...prev,
          decryptedFile: null,
          releaseStatus: {
            canDecrypt: false,
            releaseType: 'burn-after-read',
            warningMessage: 'File has been burned after download'
          }
        }));
      }
    }

    const blob = new Blob([state.decryptedFile.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = state.decryptedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setState({
      encryptedFile: null,
      keyShares: [],
      isDecrypting: false,
      decryptedFile: null,
      releaseStatus: { canDecrypt: true },
    });
    if (encryptedFileRef.current) encryptedFileRef.current.value = '';
    if (keySharesRef.current) keySharesRef.current.value = '';
  };

  const formatTimeRemaining = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="decrypt-handler">
      <div className="decrypt-section">
        <h3>Decrypt a File</h3>
        <p className="section-description">
          Upload your encrypted file and at least 2 key shares to decrypt and download the original file.
        </p>

        {/* Release Status Display */}
        {!state.releaseStatus.canDecrypt && (
          <div className="release-restriction">
            <div className="restriction-icon">RESTRICTED:</div>
            <div className="restriction-content">
              <h4>Decryption Restricted</h4>
              <p>{state.releaseStatus.warningMessage}</p>
              {state.releaseStatus.timeRemaining && (
                <div className="time-remaining">
                  Time remaining: {formatTimeRemaining(state.releaseStatus.timeRemaining)}
                </div>
              )}
            </div>
          </div>
        )}

        {state.releaseStatus.canDecrypt && state.releaseStatus.viewsRemaining !== undefined && (
          <div className="burn-warning">
            <div className="warning-icon">WARNING:</div>
            <div className="warning-content">
              <strong>Burn After Read:</strong> {state.releaseStatus.viewsRemaining} view{state.releaseStatus.viewsRemaining !== 1 ? 's' : ''} remaining
              {state.releaseStatus.warningMessage && (
                <p>{state.releaseStatus.warningMessage}</p>
              )}
            </div>
          </div>
        )}

        <div className="upload-group">
          <div className="upload-item">
            <label htmlFor="encrypted-file" className="upload-label">
              Encrypted File (.encrypted or .json)
            </label>
            <input
              ref={encryptedFileRef}
              id="encrypted-file"
              type="file"
              accept=".encrypted,.json"
              onChange={handleEncryptedFileUpload}
              className="file-input"
            />
            {state.encryptedFile && (
              <div className="file-info">
                Selected: {state.encryptedFile.name}
              </div>
            )}
          </div>

          <div className="upload-item">
            <label htmlFor="key-shares" className="upload-label">
              Key Shares (minimum 2 .json files)
            </label>
            <input
              ref={keySharesRef}
              id="key-shares"
              type="file"
              accept=".json"
              multiple
              onChange={handleKeySharesUpload}
              className="file-input"
            />
            {state.keyShares.length > 0 && (
              <div className="file-info">
                Selected: {state.keyShares.length} key share{state.keyShares.length !== 1 ? 's' : ''}
                <div className="share-list">
                  {state.keyShares.map((file, index) => (
                    <div key={index} className="share-item">
                      {file.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="action-buttons">
          <button
            onClick={handleDecrypt}
            disabled={!state.encryptedFile || state.keyShares.length < 2 || state.isDecrypting}
            className="decrypt-button primary-button"
          >
            {state.isDecrypting ? (
              <>
                <span className="loading-spinner"></span>
                Decrypting...
              </>
            ) : (
              'Decrypt File'
            )}
          </button>

          <button
            onClick={resetForm}
            disabled={state.isDecrypting}
            className="reset-button secondary-button"
          >
            Reset
          </button>
        </div>

        {state.decryptedFile && (
          <div className="success-section">
            <div className="success-message">
              <span className="success-icon">SUCCESS:</span>
              File decrypted successfully!
            </div>
            <div className="download-section">
              <div className="file-details">
                <strong>Original file:</strong> {state.decryptedFile.name}
                <br />
                <strong>Size:</strong> {(state.decryptedFile.data.byteLength / 1024 / 1024).toFixed(2)} MB
              </div>
              <button
                onClick={downloadDecryptedFile}
                className="download-button primary-button"
              >
                Download Decrypted File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}