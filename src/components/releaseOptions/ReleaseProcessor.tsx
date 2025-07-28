import { useState, useEffect } from 'react';
import { 
  ReleaseConfig, 
  ExtendedEncryptionResult,
  STORAGE_KEYS 
} from '../../types/releaseOptions';
import { ReleaseUtils } from '../../utils/releaseUtils';

interface ReleaseProcessorProps {
  config: ReleaseConfig;
  encryptionResult: ExtendedEncryptionResult;
  onComplete: () => void;
  onError: (error: string) => void;
}

export function ReleaseProcessor({ 
  config, 
  encryptionResult, 
  onComplete, 
  onError 
}: ReleaseProcessorProps) {
  const [processingStage, setProcessingStage] = useState<'idle' | 'preparing' | 'processing' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    processRelease();
  }, []);

  const processRelease = async () => {
    try {
      setProcessingStage('preparing');
      setStatusMessage('Preparing release...');
      setProgress(10);

      switch (config.type) {
        case 'designated':
          await processDesignatedRelease();
          break;
        case 'public':
          await processPublicRelease();
          break;
        case 'multi-recipient':
          await processMultiRecipientRelease();
          break;
        case 'timed':
          await processTimedRelease();
          break;
        case 'burn-after-read':
          await processBurnAfterReadRelease();
          break;
      }

      setProcessingStage('complete');
      setProgress(100);
      onComplete();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Processing failed');
    }
  };

  const processDesignatedRelease = async () => {
    if (config.type !== 'designated') return;
    
    setStatusMessage('Checking designated session...');
    setProgress(30);
    
    const currentSession = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
    const isDesignatedSession = currentSession === config.designatedSessionId;
    
    if (!isDesignatedSession) {
      throw new Error('This session is not authorized to decrypt this file');
    }
    
    setStatusMessage('Session verified, preparing decryption...');
    setProgress(70);
    
    // Store the decrypted file data for the designated session
    await ReleaseUtils.storeForDesignatedSession(encryptionResult, config);
    
    setStatusMessage('File ready for designated recipient');
    setProgress(100);
  };

  const processPublicRelease = async () => {
    if (config.type !== 'public') return;
    
    setStatusMessage('Preparing for public upload...');
    setProgress(30);
    
    switch (config.outlet) {
      case 'ipfs':
        setStatusMessage('Uploading to IPFS...');
        setProgress(50);
        await ReleaseUtils.uploadToIPFS(encryptionResult, config);
        break;
      case 'arweave':
        setStatusMessage('Uploading to Arweave...');
        setProgress(50);
        await ReleaseUtils.uploadToArweave(encryptionResult, config);
        break;
      case 'custom':
        setStatusMessage('Uploading to custom endpoint...');
        setProgress(50);
        await ReleaseUtils.uploadToCustomEndpoint(encryptionResult, config);
        break;
    }
    
    setStatusMessage('File uploaded successfully');
    setProgress(100);
  };

  const processMultiRecipientRelease = async () => {
    if (config.type !== 'multi-recipient') return;
    
    setStatusMessage('Encrypting for multiple recipients...');
    setProgress(30);
    
    const totalRecipients = config.recipients.length;
    
    for (let i = 0; i < totalRecipients; i++) {
      const recipient = config.recipients[i];
      setStatusMessage(`Encrypting for ${recipient.name || 'recipient'} (${i + 1}/${totalRecipients})`);
      setProgress(30 + (60 * i / totalRecipients));
      
      await ReleaseUtils.encryptForRecipient(encryptionResult, recipient);
    }
    
    setStatusMessage('All recipient versions created');
    setProgress(100);
  };

  const processTimedRelease = async () => {
    if (config.type !== 'timed') return;
    
    setStatusMessage('Setting up timed release...');
    setProgress(30);
    
    const triggerTime = Date.now() + (config.delayHours * 60 * 60 * 1000);
    
    // Store timer state
    const timerState = {
      triggerTimestamp: triggerTime,
      delayHours: config.delayHours,
      warningMessage: config.warningMessage
    };
    
    localStorage.setItem(STORAGE_KEYS.TIMER_STATE, JSON.stringify(timerState));
    
    setStatusMessage(`Timer set for ${config.delayHours} hours`);
    setProgress(70);
    
    // Start countdown
    startCountdown(triggerTime);
    
    setProgress(100);
  };

  const processBurnAfterReadRelease = async () => {
    if (config.type !== 'burn-after-read') return;
    
    setStatusMessage('Setting up burn-after-read...');
    setProgress(50);
    
    // Initialize burn state
    const burnState = {
      maxViews: config.maxViews,
      viewCount: 0,
      burnOnDownload: config.burnOnDownload,
      warningMessage: config.warningMessage
    };
    
    localStorage.setItem(STORAGE_KEYS.BURN_STATE, JSON.stringify(burnState));
    
    setStatusMessage('Burn-after-read configured');
    setProgress(100);
  };

  const startCountdown = (triggerTime: number) => {
    const updateCountdown = () => {
      const remaining = Math.max(0, triggerTime - Date.now());
      setTimeRemaining(remaining);
      
      if (remaining > 0) {
        setTimeout(updateCountdown, 1000);
      }
    };
    
    updateCountdown();
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

  const renderStageIcon = () => {
    switch (processingStage) {
      case 'preparing':
        return 'PROCESSING:';
      case 'processing':
        return '🔄';
      case 'complete':
        return 'SUCCESS:';
      default:
        return 'WAIT:';
    }
  };

  const renderTypeSpecificInfo = () => {
    switch (config.type) {
      case 'timed':
        return timeRemaining !== null && (
          <div className="countdown-display">
            <div className="countdown-icon">TIMER:</div>
            <div className="countdown-text">
              {timeRemaining > 0 ? (
                <>
                  <div className="time-remaining">
                    {formatTimeRemaining(timeRemaining)}
                  </div>
                  <div className="countdown-label">remaining</div>
                </>
              ) : (
                <div className="time-expired">
                  Time expired - file ready for decryption
                </div>
              )}
            </div>
          </div>
        );
      
      case 'burn-after-read':
        const burnState = JSON.parse(localStorage.getItem(STORAGE_KEYS.BURN_STATE) || '{}');
        return (
          <div className="burn-status">
            <div className="burn-icon">🔥</div>
            <div className="burn-info">
              <div>Views remaining: {burnState.maxViews - burnState.viewCount}</div>
              {burnState.burnOnDownload && (
                <div className="burn-warning">Will burn on download</div>
              )}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="release-processor">
      <div className="processor-header">
        <div className="stage-icon">{renderStageIcon()}</div>
        <h3>Processing Release</h3>
      </div>

      <div className="progress-section">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="progress-text">{progress}%</div>
      </div>

      <div className="status-section">
        <div className="status-message">{statusMessage}</div>
        {renderTypeSpecificInfo()}
      </div>

      {processingStage === 'complete' && (
        <div className="completion-message">
          <div className="completion-icon">🎉</div>
          <h4>Release Processing Complete</h4>
          <p>Your release option has been configured and is now active.</p>
        </div>
      )}
    </div>
  );
}