import { useState } from 'react';
import { TimedReleaseConfig } from '../../types/releaseOptions';

interface TimedReleaseSetupProps {
  onSave: (config: TimedReleaseConfig) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

const PRESET_DELAYS = [
  { hours: 1, label: '1 hour' },
  { hours: 6, label: '6 hours' },
  { hours: 12, label: '12 hours' },
  { hours: 24, label: '1 day' },
  { hours: 48, label: '2 days' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '1 week' },
  { hours: 720, label: '1 month' }
];

export function TimedReleaseSetup({ onSave, onCancel, onError }: TimedReleaseSetupProps) {
  const [delayHours, setDelayHours] = useState(72);
  const [warningMessage, setWarningMessage] = useState('');
  const [usePreset, setUsePreset] = useState(true);

  const handlePresetSelect = (hours: number) => {
    setDelayHours(hours);
    setUsePreset(true);
  };

  const handleCustomDelayChange = (value: string) => {
    const hours = parseInt(value) || 0;
    setDelayHours(hours);
    setUsePreset(false);
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    if (hours < 168) return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) !== 1 ? 's' : ''}`;
    if (hours < 720) return `${Math.floor(hours / 168)} week${Math.floor(hours / 168) !== 1 ? 's' : ''}`;
    return `${Math.floor(hours / 720)} month${Math.floor(hours / 720) !== 1 ? 's' : ''}`;
  };

  const handleSave = () => {
    if (delayHours < 1) {
      onError('Delay must be at least 1 hour');
      return;
    }

    if (delayHours > 8760) { // 1 year
      onError('Delay cannot exceed 1 year (8760 hours)');
      return;
    }

    const config: TimedReleaseConfig = {
      type: 'timed',
      delayHours,
      warningMessage: warningMessage.trim() || undefined
    };

    onSave(config);
  };

  return (
    <div className="release-setup timed-setup">
      <div className="setup-header">
        <h3>TIMER: Timed Release Setup</h3>
        <p>Add a delay timer after the threshold is reached before allowing decryption</p>
      </div>

      <div className="setup-content">
        <div className="form-section">
          <label>Delay Duration</label>
          <div className="preset-grid">
            {PRESET_DELAYS.map((preset) => (
              <button
                key={preset.hours}
                type="button"
                onClick={() => handlePresetSelect(preset.hours)}
                className={`preset-button ${delayHours === preset.hours && usePreset ? 'active' : ''}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          
          <div className="custom-delay">
            <label htmlFor="custom-hours">Or set custom hours:</label>
            <input
              id="custom-hours"
              type="number"
              min="1"
              max="8760"
              value={delayHours}
              onChange={(e) => handleCustomDelayChange(e.target.value)}
              className="custom-input"
            />
            <span className="duration-display">
              = {formatDuration(delayHours)}
            </span>
          </div>
        </div>

        <div className="form-section">
          <label htmlFor="warning-message">Warning Message (Optional)</label>
          <textarea
            id="warning-message"
            value={warningMessage}
            onChange={(e) => setWarningMessage(e.target.value)}
            placeholder="Message to display during the waiting period..."
            rows={3}
            className="message-textarea"
          />
          <div className="form-hint">
            This message will be shown to anyone who tries to access the file during the delay period.
          </div>
        </div>

        <div className="preview-section">
          <h4>Timeline Preview</h4>
          <div className="timeline">
            <div className="timeline-step">
              <div className="step-icon">🔑</div>
              <div className="step-content">
                <strong>Threshold Reached</strong>
                <p>Enough key shares submitted</p>
              </div>
            </div>
            <div className="timeline-arrow">→</div>
            <div className="timeline-step">
              <div className="step-icon">WAIT:</div>
              <div className="step-content">
                <strong>Waiting Period</strong>
                <p>{formatDuration(delayHours)} delay</p>
              </div>
            </div>
            <div className="timeline-arrow">→</div>
            <div className="timeline-step">
              <div className="step-icon">🔓</div>
              <div className="step-content">
                <strong>File Released</strong>
                <p>Decryption allowed</p>
              </div>
            </div>
          </div>
        </div>

        <div className="security-notice">
          <div className="notice-icon">TIMER:</div>
          <div className="notice-content">
            <h4>How timed release works:</h4>
            <ul>
              <li>Timer starts when threshold shares are submitted</li>
              <li>File remains encrypted during waiting period</li>
              <li>Timer state stored locally (client-side only)</li>
              <li>Useful for "cooling off" periods or legal requirements</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="setup-actions">
        <button onClick={onCancel} className="cancel-button">
          Cancel
        </button>
        <button onClick={handleSave} className="save-button">
          Configure Timed Release
        </button>
      </div>
    </div>
  );
}