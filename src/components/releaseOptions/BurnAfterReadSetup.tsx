import { useState } from 'react';
import { BurnAfterReadConfig } from '../../types/releaseOptions';

interface BurnAfterReadSetupProps {
  onSave: (config: BurnAfterReadConfig) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

export function BurnAfterReadSetup({ onSave, onCancel, onError }: BurnAfterReadSetupProps) {
  const [maxViews, setMaxViews] = useState(1);
  const [burnOnDownload, setBurnOnDownload] = useState(true);
  const [warningMessage, setWarningMessage] = useState('');

  const handleMaxViewsChange = (value: string) => {
    const views = parseInt(value) || 1;
    setMaxViews(Math.max(1, Math.min(10, views))); // Limit between 1-10
  };

  const handleSave = () => {
    if (maxViews < 1) {
      onError('Must allow at least 1 view');
      return;
    }

    if (maxViews > 10) {
      onError('Maximum 10 views allowed for security');
      return;
    }

    const config: BurnAfterReadConfig = {
      type: 'burn-after-read',
      maxViews,
      viewCount: 0,
      burnOnDownload,
      warningMessage: warningMessage.trim() || undefined
    };

    onSave(config);
  };

  return (
    <div className="release-setup burn-setup">
      <div className="setup-header">
        <h3>🔥 Burn After Read Setup</h3>
        <p>Allow limited viewing, then permanently destroy the decrypted copy</p>
      </div>

      <div className="setup-content">
        <div className="form-section">
          <label htmlFor="max-views">Maximum Views Allowed</label>
          <div className="view-counter">
            <input
              id="max-views"
              type="number"
              min="1"
              max="10"
              value={maxViews}
              onChange={(e) => handleMaxViewsChange(e.target.value)}
              className="views-input"
            />
            <div className="view-buttons">
              {[1, 2, 3, 5].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMaxViews(num)}
                  className={`view-preset ${maxViews === num ? 'active' : ''}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
          <div className="form-hint">
            After this many views, the decrypted copy will be permanently destroyed.
            Maximum 10 views for security reasons.
          </div>
        </div>

        <div className="form-section">
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={burnOnDownload}
                onChange={(e) => setBurnOnDownload(e.target.checked)}
              />
              <span className="checkbox-text">
                Burn immediately on download (regardless of view count)
              </span>
            </label>
          </div>
          <div className="form-hint">
            If enabled, downloading the file will immediately trigger burning,
            even if max views haven't been reached.
          </div>
        </div>

        <div className="form-section">
          <label htmlFor="burn-warning">Warning Message (Optional)</label>
          <textarea
            id="burn-warning"
            value={warningMessage}
            onChange={(e) => setWarningMessage(e.target.value)}
            placeholder="Warning to display before viewing (e.g., 'This file will be destroyed after viewing')..."
            rows={3}
            className="message-textarea"
          />
        </div>

        <div className="burn-behavior">
          <h4>Burn Behavior</h4>
          <div className="behavior-grid">
            <div className="behavior-item">
              <div className="behavior-icon">👁️</div>
              <div className="behavior-text">
                <strong>View Tracking</strong>
                <p>Each view decrements remaining count</p>
              </div>
            </div>
            <div className="behavior-item">
              <div className="behavior-icon">💾</div>
              <div className="behavior-text">
                <strong>Download Trigger</strong>
                <p>
                  {burnOnDownload 
                    ? 'Burns immediately on download'
                    : 'Download counts as one view'
                  }
                </p>
              </div>
            </div>
            <div className="behavior-item">
              <div className="behavior-icon">🔥</div>
              <div className="behavior-text">
                <strong>Permanent Destruction</strong>
                <p>Decrypted data cleared from memory</p>
              </div>
            </div>
          </div>
        </div>

        <div className="security-notice warning">
          <div className="notice-icon">⚠️</div>
          <div className="notice-content">
            <h4>Important Security Notice:</h4>
            <ul>
              <li><strong>This cannot be undone</strong> - once burned, the file is gone forever</li>
              <li>Browser refresh or navigation will reset the view counter</li>
              <li>Multiple browser tabs count as separate views</li>
              <li>View state is stored locally and can be cleared</li>
              <li>Consider downloading before viewing if you need a permanent copy</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="setup-actions">
        <button onClick={onCancel} className="cancel-button">
          Cancel
        </button>
        <button onClick={handleSave} className="save-button destructive">
          Configure Burn After Read
        </button>
      </div>
    </div>
  );
}