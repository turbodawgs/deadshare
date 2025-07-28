import { useState, useEffect } from 'react';
import { 
  ReleaseOptionsState, 
  ReleaseConfig, 
  ReleaseOptionType,
  ExtendedEncryptionResult,
  STORAGE_KEYS 
} from '../types/releaseOptions';
import './ReleaseOptions.css';
import { DesignatedReleaseSetup } from './releaseOptions/DesignatedReleaseSetup';
import { PublicReleaseSetup } from './releaseOptions/PublicReleaseSetup';
import { MultiRecipientSetup } from './releaseOptions/MultiRecipientSetup';
import { TimedReleaseSetup } from './releaseOptions/TimedReleaseSetup';
import { BurnAfterReadSetup } from './releaseOptions/BurnAfterReadSetup';
import { ReleaseProcessor } from './releaseOptions/ReleaseProcessor';

interface ReleaseOptionsManagerProps {
  encryptionResult: ExtendedEncryptionResult;
  onConfigComplete: (config: ReleaseConfig) => void;
  onError: (error: string) => void;
}

const RELEASE_OPTIONS: Array<{
  type: ReleaseOptionType;
  title: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}> = [
  {
    type: 'designated',
    title: 'Designated Recipient',
    description: 'Only show decrypted file in a specific browser session (digital executor)',
    riskLevel: 'low'
  },
  {
    type: 'timed',
    title: 'Timed Release',
    description: 'Add delay timer after threshold is reached (e.g., 72 hours)',
    riskLevel: 'low'
  },
  {
    type: 'burn-after-read',
    title: 'Burn After Read',
    description: 'Allow only one viewing/download, then destroy decrypted copy',
    riskLevel: 'medium'
  },
  {
    type: 'multi-recipient',
    title: 'Multiple Recipients',
    description: 'Encrypt separately for multiple recipients with their public keys',
    riskLevel: 'medium'
  },
  {
    type: 'public',
    title: 'Public Release',
    description: 'Upload to IPFS or public outlet for anyone to access',
    riskLevel: 'high'
  }
];

export function ReleaseOptionsManager({ 
  encryptionResult, 
  onConfigComplete, 
  onError 
}: ReleaseOptionsManagerProps) {
  const [state, setState] = useState<ReleaseOptionsState>({
    isConfigured: false,
    selectedType: null,
    config: null,
    isProcessing: false,
    error: null,
    thresholdReached: false,
    processingStage: 'idle'
  });

  // Check if threshold has been reached (integrate with your existing Shamir logic)
  useEffect(() => {
    // This would integrate with your DecryptHandler logic
    // When enough shares are submitted, set thresholdReached to true
    // For now, this is a placeholder
  }, []);

  const handleOptionSelect = (type: ReleaseOptionType) => {
    setState(prev => ({
      ...prev,
      selectedType: type,
      error: null
    }));
  };

  const handleConfigSave = (config: ReleaseConfig) => {
    setState(prev => ({
      ...prev,
      config,
      isConfigured: true,
      error: null
    }));
    
    // Store configuration client-side
    localStorage.setItem(STORAGE_KEYS.RELEASE_CONFIG, JSON.stringify(config));
    onConfigComplete(config);
  };

  const handleReset = () => {
    setState({
      isConfigured: false,
      selectedType: null,
      config: null,
      isProcessing: false,
      error: null,
      thresholdReached: false,
      processingStage: 'idle'
    });
    localStorage.removeItem(STORAGE_KEYS.RELEASE_CONFIG);
  };

  const renderSetupComponent = () => {
    if (!state.selectedType) return null;

    const commonProps = {
      onSave: handleConfigSave,
      onCancel: () => setState(prev => ({ ...prev, selectedType: null })),
      onError
    };

    switch (state.selectedType) {
      case 'designated':
        return <DesignatedReleaseSetup {...commonProps} />;
      case 'public':
        return <PublicReleaseSetup {...commonProps} />;
      case 'multi-recipient':
        return <MultiRecipientSetup {...commonProps} />;
      case 'timed':
        return <TimedReleaseSetup {...commonProps} />;
      case 'burn-after-read':
        return <BurnAfterReadSetup {...commonProps} />;
      default:
        return null;
    }
  };

  // If processing release after threshold reached
  if (state.thresholdReached && state.config) {
    return (
      <ReleaseProcessor
        config={state.config}
        encryptionResult={encryptionResult}
        onComplete={() => setState(prev => ({ ...prev, processingStage: 'complete' }))}
        onError={onError}
      />
    );
  }

  // Configuration complete - show summary
  if (state.isConfigured && state.config) {
    const selectedOption = RELEASE_OPTIONS.find(opt => opt.type === state.config!.type);
    
    return (
      <div className="release-options-manager configured">
        <div className="config-summary">
          <div className="summary-header">
            <span className="summary-type">[{selectedOption?.type.toUpperCase()}]</span>
            <h3>Release Option Configured</h3>
          </div>
          <div className="summary-content">
            <p><strong>{selectedOption?.title}</strong></p>
            <p className="summary-description">{selectedOption?.description}</p>
            <div className="config-details">
              {/* Render specific config details based on type */}
              {state.config.type === 'timed' && 'delayHours' in state.config && (
                <p>Delay: {state.config.delayHours} hours after threshold</p>
              )}
              {state.config.type === 'burn-after-read' && 'maxViews' in state.config && (
                <p>Max views: {state.config.maxViews}</p>
              )}
              {state.config.type === 'multi-recipient' && 'recipients' in state.config && (
                <p>Recipients: {state.config.recipients.length}</p>
              )}
            </div>
          </div>
          <div className="summary-actions">
            <button onClick={handleReset} className="reset-button">
              Change Option
            </button>
          </div>
        </div>
        
        <div className="waiting-status">
          <div className="status-icon">WAIT:</div>
          <p>Waiting for threshold to be reached...</p>
          <p className="status-note">
            Once {encryptionResult.config.threshold} key shares are submitted for decryption,
            your release option will be activated.
          </p>
        </div>
      </div>
    );
  }

  // Show setup component if option selected
  if (state.selectedType) {
    return (
      <div className="release-options-manager setup">
        {renderSetupComponent()}
      </div>
    );
  }

  // Main selection interface
  return (
    <div className="release-options-manager">
      <div className="header">
        <h2>Configure Release Options</h2>
        <p className="description">
          Choose what happens after enough key shares are submitted for decryption.
          This is completely client-side and zero-trust.
        </p>
      </div>

      <div className="options-grid">
        {RELEASE_OPTIONS.map((option) => (
          <div
            key={option.type}
            className={`option-card risk-${option.riskLevel}`}
            onClick={() => handleOptionSelect(option.type)}
          >
            <div className="option-type">[{option.type.replace('-', ' ').toUpperCase()}]</div>
            <h3 className="option-title">{option.title}</h3>
            <p className="option-description">{option.description}</p>
            <div className={`risk-indicator risk-${option.riskLevel}`}>
              Privacy: {option.riskLevel}
            </div>
          </div>
        ))}
      </div>

      <div className="info-section">
        <div className="info-icon">🔒</div>
        <div className="info-content">
          <h4>Zero-Trust Architecture</h4>
          <p>
            All release options work entirely client-side. No data is stored on any server.
            Configuration is saved locally in your browser.
          </p>
        </div>
      </div>

      {state.error && (
        <div className="error-message">
          WARNING: {state.error}
        </div>
      )}
    </div>
  );
}