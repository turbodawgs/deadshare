import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { EncryptionHandler } from './components/EncryptionHandler';
import { ShareDisplay } from './components/ShareDisplay';
import { DecryptHandler } from './components/DecryptHandler';
import { DeadManSwitchManager } from './components/DeadManSwitchManager';
import { ReleaseOptionsManager } from './components/ReleaseOptionsManager';
import { EncryptionResult } from './types';
import { ReleaseConfig } from './types/releaseOptions';
import './components/DecryptHandler.css';
import './components/DeadManSwitchManager.css';

type AppStep = 'upload' | 'encrypt' | 'release-options' | 'shares' | 'decrypt' | 'deadman';

function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [encryptionResult, setEncryptionResult] = useState<EncryptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setCurrentStep('encrypt');
    setError(null);
  };

  const handleEncryptionComplete = (result: EncryptionResult) => {
    setEncryptionResult(result);
    setCurrentStep('release-options');
    setError(null);
  };

  const handleReleaseOptionsComplete = (config: ReleaseConfig) => {
    if (encryptionResult) {
      const updatedResult = {
        ...encryptionResult,
        releaseOptions: config,
        createdAt: Date.now()
      };
      setEncryptionResult(updatedResult);
      setCurrentStep('shares');
    }
  };

  const handleSkipReleaseOptions = () => {
    setCurrentStep('shares');
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleReset = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setEncryptionResult(null);
    setError(null);
  };

  const getStepNumber = (step: AppStep): number => {
    switch (step) {
      case 'upload': return 1;
      case 'encrypt': return 2;
      case 'release-options': return 3;
      case 'shares': return 4;
      case 'decrypt': return 5;
      case 'deadman': return 6;
      default: return 1;
    }
  };

  const handleNavigateToDecrypt = () => {
    setCurrentStep('decrypt');
    setError(null);
  };

  const handleNavigateToDeadMan = () => {
    setCurrentStep('deadman');
    setError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            deadshare
          </h1>
          <p className="app-subtitle">
            Privacy-focused file sharing with client-side encryption and Shamir's Secret Sharing
          </p>
          <div className="mode-switcher">
            <button 
              onClick={handleReset}
              className={`mode-button ${currentStep === 'upload' || currentStep === 'encrypt' || currentStep === 'release-options' || currentStep === 'shares' ? 'active' : ''}`}
            >
              Encrypt
            </button>
            <button 
              onClick={handleNavigateToDecrypt}
              className={`mode-button ${currentStep === 'decrypt' ? 'active' : ''}`}
            >
              Decrypt
            </button>
            <button 
              onClick={handleNavigateToDeadMan}
              className={`mode-button ${currentStep === 'deadman' ? 'active' : ''}`}
            >
              Dead Man Switch
            </button>
          </div>
        </div>
      </header>

      <nav className="step-indicator">
        <div className="steps">
          <div className={`step ${currentStep === 'upload' ? 'active' : ''} ${getStepNumber(currentStep) > 1 ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Upload File</div>
          </div>
          <div className="step-divider"></div>
          <div className={`step ${currentStep === 'encrypt' ? 'active' : ''} ${getStepNumber(currentStep) > 2 ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Encrypt</div>
          </div>
          <div className="step-divider"></div>
          <div className={`step ${currentStep === 'release-options' ? 'active' : ''} ${getStepNumber(currentStep) > 3 ? 'completed' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Release Options</div>
          </div>
          <div className="step-divider"></div>
          <div className={`step ${currentStep === 'shares' ? 'active' : ''}`}>
            <div className="step-number">4</div>
            <div className="step-label">Download Shares</div>
          </div>
        </div>
      </nav>

      <main className="app-main">
        {error && (
          <div className="global-error">
            <div className="error-content">
              <span className="error-text">{error}</span>
              <button onClick={() => setError(null)} className="error-dismiss">
                ×
              </button>
            </div>
          </div>
        )}

        <div className="step-content">
          {currentStep === 'upload' && (
            <div className="step-section">
              <h2>Step 1: Select a File to Encrypt</h2>
              <p className="step-description">
                Choose any file you want to encrypt and share securely. 
                The file will be encrypted locally in your browser using AES-256.
              </p>
              <FileUpload onFileSelect={handleFileSelect} />
            </div>
          )}

          {currentStep === 'encrypt' && (
            <div className="step-section">
              <h2>Step 2: Configure Encryption</h2>
              <p className="step-description">
                Set up how you want to split your encryption key. 
                The key will be divided into multiple shares using Shamir's Secret Sharing.
              </p>
              <EncryptionHandler
                file={selectedFile}
                onEncryptionComplete={handleEncryptionComplete}
                onError={handleError}
              />
              <div className="back-button-container">
                <button onClick={handleReset} className="back-button">
                  ← Back to File Upload
                </button>
              </div>
            </div>
          )}

          {currentStep === 'release-options' && encryptionResult && (
            <div className="step-section">
              <h2>Step 3: Configure Release Options (Optional)</h2>
              <p className="step-description">
                Choose what happens after enough key shares are submitted for decryption.
                This step is optional - you can skip it for standard file sharing.
              </p>
              <ReleaseOptionsManager
                encryptionResult={encryptionResult}
                onConfigComplete={handleReleaseOptionsComplete}
                onError={handleError}
              />
              <div className="release-options-actions">
                <button onClick={handleSkipReleaseOptions} className="skip-button">
                  Skip Release Options →
                </button>
                <button onClick={() => setCurrentStep('encrypt')} className="back-button">
                  ← Back to Encryption
                </button>
              </div>
            </div>
          )}

          {currentStep === 'shares' && encryptionResult && (
            <div className="step-section">
              <ShareDisplay result={encryptionResult} onReset={handleReset} />
            </div>
          )}

          {currentStep === 'decrypt' && (
            <div className="step-section">
              <h2>Decrypt a File</h2>
              <p className="step-description">
                Upload your encrypted file and key shares to decrypt and download the original file.
              </p>
              <DecryptHandler onError={handleError} />
              <div className="back-button-container">
                <button onClick={handleReset} className="back-button">
                  ← Back to Encrypt Mode
                </button>
              </div>
            </div>
          )}

          {currentStep === 'deadman' && (
            <div className="step-section">
              <DeadManSwitchManager 
                encryptionResult={encryptionResult || undefined}
                onError={handleError}
              />
              <div className="back-button-container">
                <button onClick={handleReset} className="back-button">
                  ← Back to Encrypt Mode
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="security-features">
            <div className="feature">
              <span>AES-256 Encryption</span>
            </div>
            <div className="feature">
              <span>Shamir's Secret Sharing</span>
            </div>
            <div className="feature">
              <span>Client-Side Only</span>
            </div>
            <div className="feature">
              <span>No Data Stored</span>
            </div>
          </div>
          <div className="footer-note">
            All encryption happens locally in your browser. No data is sent to any server.
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;