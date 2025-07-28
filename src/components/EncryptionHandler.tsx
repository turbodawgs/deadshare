import { useState, useCallback } from 'react';
import { EncryptionState, EncryptionResult, ShamirConfig } from '../types';
import { EncryptionUtils } from '../utils/encryption';
import { ShamirUtils } from '../utils/shamir';
import './EncryptionHandler.css';

interface EncryptionHandlerProps {
  file: File | null;
  onEncryptionComplete: (result: EncryptionResult) => void;
  onError: (error: string) => void;
}

export const EncryptionHandler: React.FC<EncryptionHandlerProps> = ({
  file,
  onEncryptionComplete,
  onError
}) => {
  const [encryptionState, setEncryptionState] = useState<EncryptionState>({
    isEncrypting: false,
    isComplete: false,
    error: null,
    result: null
  });

  const [shamirConfig, setShamirConfig] = useState<ShamirConfig>({
    threshold: 3,
    totalShares: 5
  });

  const handleEncryption = useCallback(async () => {
    if (!file) {
      onError('No file selected for encryption');
      return;
    }

    setEncryptionState({
      isEncrypting: true,
      isComplete: false,
      error: null,
      result: null
    });

    try {
      // Step 1: Generate encryption key
      const encryptionKey = await EncryptionUtils.generateKey();

      // Step 2: Encrypt the file
      const encryptedFile = await EncryptionUtils.encryptFile(file, encryptionKey);

      // Step 3: Split the key using Shamir's Secret Sharing
      const keyShares = await ShamirUtils.splitKey(
        encryptionKey,
        shamirConfig.threshold,
        shamirConfig.totalShares
      );

      const result: EncryptionResult = {
        encryptedFile,
        keyShares,
        config: shamirConfig,
        createdAt: Date.now()
      };

      setEncryptionState({
        isEncrypting: false,
        isComplete: true,
        error: null,
        result
      });

      onEncryptionComplete(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown encryption error';
      setEncryptionState({
        isEncrypting: false,
        isComplete: false,
        error: errorMessage,
        result: null
      });
      onError(errorMessage);
    }
  }, [file, shamirConfig, onEncryptionComplete, onError]);

  const handleConfigChange = (field: keyof ShamirConfig, value: number) => {
    setShamirConfig(prev => {
      const newConfig = { ...prev, [field]: value };
      
      // Ensure threshold doesn't exceed totalShares
      if (field === 'totalShares' && newConfig.threshold > value) {
        newConfig.threshold = value;
      }
      if (field === 'threshold' && value > newConfig.totalShares) {
        newConfig.totalShares = value;
      }
      
      return newConfig;
    });
  };

  const reset = () => {
    setEncryptionState({
      isEncrypting: false,
      isComplete: false,
      error: null,
      result: null
    });
  };

  if (!file) {
    return (
      <div className="encryption-handler">
        <div className="no-file-message">
          Please select a file to encrypt
        </div>
      </div>
    );
  }

  if (encryptionState.isComplete && encryptionState.result) {
    return (
      <div className="encryption-handler">
        <div className="success-message">
          File encrypted successfully!
          <div className="file-info">
            <strong>{file.name}</strong> has been encrypted and split into {shamirConfig.totalShares} key shares.
            You need at least {shamirConfig.threshold} shares to decrypt the file.
          </div>
          <button onClick={reset} className="reset-button">
            Encrypt Another File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="encryption-handler">
      <div className="file-preview">
        <div className="file-icon">File:</div>
        <div className="file-details">
          <div className="file-name">{file.name}</div>
          <div className="file-size">
            {(file.size / (1024 * 1024)).toFixed(2)} MB
          </div>
        </div>
      </div>

      <div className="config-section">
        <h3>Encryption Configuration</h3>
        <div className="config-grid">
          <div className="config-item">
            <label htmlFor="totalShares">Total Key Shares:</label>
            <input
              id="totalShares"
              type="number"
              min="2"
              max="255"
              value={shamirConfig.totalShares}
              onChange={(e) => handleConfigChange('totalShares', parseInt(e.target.value) || 2)}
              disabled={encryptionState.isEncrypting}
            />
            <div className="config-hint">
              Number of key shares to generate (2-255)
            </div>
          </div>

          <div className="config-item">
            <label htmlFor="threshold">Threshold:</label>
            <input
              id="threshold"
              type="number"
              min="2"
              max={shamirConfig.totalShares}
              value={shamirConfig.threshold}
              onChange={(e) => handleConfigChange('threshold', parseInt(e.target.value) || 2)}
              disabled={encryptionState.isEncrypting}
            />
            <div className="config-hint">
              Minimum shares needed to decrypt (2-{shamirConfig.totalShares})
            </div>
          </div>
        </div>

        <div className="security-info">
          <div className="info-icon">Security:</div>
          <div className="info-text">
            <strong>Security Notice:</strong> Your file will be encrypted with AES-256 and the 
            encryption key will be split into {shamirConfig.totalShares} shares. 
            Anyone with {shamirConfig.threshold} or more shares can decrypt your file.
          </div>
        </div>
      </div>

      <div className="action-section">
        <button
          onClick={handleEncryption}
          disabled={encryptionState.isEncrypting}
          className="encrypt-button"
        >
          {encryptionState.isEncrypting ? (
            <>
              <span className="spinner">Loading...</span>
              Encrypting...
            </>
          ) : (
            <>
              Encrypt File
            </>
          )}
        </button>
      </div>

      {encryptionState.error && (
        <div className="error-message">
          Error: {encryptionState.error}
        </div>
      )}

    </div>
  );
};