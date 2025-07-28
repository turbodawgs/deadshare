import { useState, useEffect, useCallback } from 'react';
import { EncryptionResult } from '../types';
import { DeadManSwitch, DeadManSwitchConfig } from '../utils/deadManSwitch';
import { ExportUtils } from '../utils/export';

interface DeadManSwitchManagerProps {
  encryptionResult?: EncryptionResult;
  onError: (error: string) => void;
}

export function DeadManSwitchManager({ encryptionResult, onError }: DeadManSwitchManagerProps) {
  const [activeSwitches, setActiveSwitches] = useState<DeadManSwitchConfig[]>([]);
  const [triggeredReleases, setTriggeredReleases] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    timeoutPeriod: DeadManSwitch.TIMEOUT_PRESETS.ONE_WEEK,
    finalMessage: '',
    releaseShares: 2,
  });

  const refreshData = useCallback(() => {
    setActiveSwitches(DeadManSwitch.getActiveSwitches());
    setTriggeredReleases(DeadManSwitch.getTriggeredReleases());
    
    // Check all switches for expiration
    DeadManSwitch.checkAllSwitches();
  }, []);

  useEffect(() => {
    refreshData();
    
    // Set up periodic checks every minute
    const interval = setInterval(refreshData, 60000);
    
    // Request notification permission
    DeadManSwitch.requestNotificationPermission();

    return () => clearInterval(interval);
  }, [refreshData]);

  const handleCreateSwitch = () => {
    if (!encryptionResult) {
      onError('No encryption result available to create dead man switch');
      return;
    }

    if (!createForm.finalMessage.trim()) {
      onError('Please enter a final message');
      return;
    }

    if (createForm.releaseShares > encryptionResult.keyShares.length) {
      onError('Cannot release more shares than available');
      return;
    }

    try {
      DeadManSwitch.createSwitch({
        timeoutPeriod: createForm.timeoutPeriod,
        finalMessage: createForm.finalMessage.trim(),
        encryptionResult,
        releaseShares: createForm.releaseShares,
      });

      setCreateForm({
        timeoutPeriod: DeadManSwitch.TIMEOUT_PRESETS.ONE_WEEK,
        finalMessage: '',
        releaseShares: 2,
      });
      setShowCreateForm(false);
      refreshData();
    } catch (error) {
      onError(`Failed to create dead man switch: ${error}`);
    }
  };

  const handleCheckIn = (switchId: string) => {
    const result = DeadManSwitch.checkIn(switchId);
    if (!result.success) {
      if (result.isExpired) {
        onError('This dead man switch has expired and cannot be checked in to');
      } else {
        onError('Failed to check in to dead man switch');
      }
    }
    refreshData();
  };

  const handleDeactivate = (switchId: string) => {
    if (DeadManSwitch.deactivateSwitch(switchId)) {
      refreshData();
    } else {
      onError('Failed to deactivate dead man switch');
    }
  };

  const handleDownloadTriggeredContent = async (release: any) => {
    try {
      // Download the encrypted file and required shares
      const sharesToRelease = release.encryptionResult.keyShares.slice(0, release.releaseShares);
      
      // Create a special release bundle
      const bundle = await ExportUtils.createSecureBundle(
        {
          ...release.encryptionResult,
          keyShares: sharesToRelease,
        },
        {
          includeEncryptedFile: true,
          includeQRCodes: true,
          includeReadme: true,
        }
      );

      const filename = `deadshare-triggered-release-${new Date().toISOString().split('T')[0]}.zip`;
      ExportUtils.downloadBlob(bundle, filename);
    } catch (error) {
      onError(`Failed to download triggered content: ${error}`);
    }
  };

  const handleClearRelease = (releaseId: string) => {
    DeadManSwitch.clearTriggeredRelease(releaseId);
    refreshData();
  };

  return (
    <div className="deadman-switch-manager">
      <div className="manager-header">
        <h3>⏰ Dead Man Switch</h3>
        <p className="manager-description">
          Set up automatic file release if you don't check in within a specified time period.
          All data stays local - no servers involved.
        </p>
      </div>

      {/* Create New Switch */}
      {encryptionResult && (
        <div className="create-section">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="create-switch-button"
          >
            {showCreateForm ? 'Cancel' : '➕ Create Dead Man Switch'}
          </button>

          {showCreateForm && (
            <div className="create-form">
              <div className="form-group">
                <label htmlFor="timeout-period">Timeout Period</label>
                <select
                  id="timeout-period"
                  value={createForm.timeoutPeriod}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, timeoutPeriod: parseInt(e.target.value) }))}
                  className="form-select"
                >
                  <option value={DeadManSwitch.TIMEOUT_PRESETS.FIFTEEN_MINUTES}>15 minutes</option>
                  <option value={DeadManSwitch.TIMEOUT_PRESETS.ONE_HOUR}>1 hour</option>
                  <option value={DeadManSwitch.TIMEOUT_PRESETS.FOUR_HOURS}>4 hours</option>
                  <option value={DeadManSwitch.TIMEOUT_PRESETS.ONE_DAY}>1 day</option>
                  <option value={DeadManSwitch.TIMEOUT_PRESETS.THREE_DAYS}>3 days</option>
                  <option value={DeadManSwitch.TIMEOUT_PRESETS.ONE_WEEK}>1 week</option>
                  <option value={DeadManSwitch.TIMEOUT_PRESETS.TWO_WEEKS}>2 weeks</option>
                  <option value={DeadManSwitch.TIMEOUT_PRESETS.ONE_MONTH}>1 month</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="release-shares">Shares to Release</label>
                <select
                  id="release-shares"
                  value={createForm.releaseShares}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, releaseShares: parseInt(e.target.value) }))}
                  className="form-select"
                >
                  {Array.from({ length: encryptionResult.keyShares.length }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>
                      {num} share{num !== 1 ? 's' : ''} 
                      {num >= encryptionResult.config.threshold && ' (sufficient to decrypt)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="final-message">Final Message</label>
                <textarea
                  id="final-message"
                  value={createForm.finalMessage}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, finalMessage: e.target.value }))}
                  placeholder="Enter a message to be displayed when the switch is triggered..."
                  className="form-textarea"
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button onClick={handleCreateSwitch} className="create-button">
                  Create Switch
                </button>
                <button onClick={() => setShowCreateForm(false)} className="cancel-button">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Switches */}
      {activeSwitches.length > 0 && (
        <div className="active-switches">
          <h4>Active Switches</h4>
          <div className="switches-grid">
            {activeSwitches.map(switchConfig => {
              const timeRemaining = DeadManSwitch.getTimeRemaining(switchConfig.id);
              const isNearExpiry = timeRemaining < (60 * 60 * 1000); // Less than 1 hour

              return (
                <div key={switchConfig.id} className={`switch-card ${isNearExpiry ? 'near-expiry' : ''}`}>
                  <div className="switch-header">
                    <div className="switch-title">
                      📁 {switchConfig.encryptionResult.encryptedFile.filename}
                    </div>
                    <div className={`time-remaining ${isNearExpiry ? 'urgent' : ''}`}>
                      {DeadManSwitch.formatTimeRemaining(timeRemaining)}
                    </div>
                  </div>

                  <div className="switch-details">
                    <div className="detail-item">
                      <span className="detail-label">Timeout:</span>
                      <span>{DeadManSwitch.getTimeoutName(switchConfig.timeoutPeriod)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Release:</span>
                      <span>{switchConfig.releaseShares} of {switchConfig.encryptionResult.keyShares.length} shares</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Created:</span>
                      <span>{new Date(switchConfig.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="switch-actions">
                    <button
                      onClick={() => handleCheckIn(switchConfig.id)}
                      className="checkin-button"
                    >
                      SELECTED: Check In
                    </button>
                    <button
                      onClick={() => handleDeactivate(switchConfig.id)}
                      className="deactivate-button"
                    >
                      🗑️ Deactivate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Triggered Releases */}
      {triggeredReleases.length > 0 && (
        <div className="triggered-releases">
          <h4>🚨 Triggered Releases</h4>
          <div className="releases-grid">
            {triggeredReleases.map(release => (
              <div key={release.id} className="release-card">
                <div className="release-header">
                  <div className="release-title">
                    📁 {release.encryptionResult.encryptedFile.filename}
                  </div>
                  <div className="trigger-time">
                    Triggered: {new Date(release.triggeredAt).toLocaleString()}
                  </div>
                </div>

                <div className="final-message">
                  <strong>Final Message:</strong>
                  <p>{release.finalMessage}</p>
                </div>

                <div className="release-info">
                  <div className="info-item">
                    Released {release.releaseShares} of {release.encryptionResult.keyShares.length} key shares
                  </div>
                  {release.releaseShares >= release.encryptionResult.config.threshold && (
                    <div className="decrypt-notice">
                      WARNING: Sufficient shares to decrypt the file
                    </div>
                  )}
                </div>

                <div className="release-actions">
                  <button
                    onClick={() => handleDownloadTriggeredContent(release)}
                    className="download-release-button"
                  >
                    📥 Download Released Content
                  </button>
                  <button
                    onClick={() => handleClearRelease(release.id)}
                    className="clear-release-button"
                  >
                    🗑️ Clear
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSwitches.length === 0 && triggeredReleases.length === 0 && !encryptionResult && (
        <div className="empty-state">
          <div className="empty-icon">⏰</div>
          <div className="empty-text">No dead man switches configured</div>
          <div className="empty-description">
            Encrypt a file first, then create a dead man switch to automatically release shares
            if you don't check in within a specified time period.
          </div>
        </div>
      )}
    </div>
  );
}