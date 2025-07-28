import { useState } from 'react';
import { DesignatedReleaseConfig, STORAGE_KEYS } from '../../types/releaseOptions';

interface DesignatedReleaseSetupProps {
  onSave: (config: DesignatedReleaseConfig) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

export function DesignatedReleaseSetup({ onSave, onCancel, onError }: DesignatedReleaseSetupProps) {
  const [sessionId, setSessionId] = useState('');
  const [message, setMessage] = useState('');
  const [useCurrentSession, setUseCurrentSession] = useState(false);

  const generateSessionId = () => {
    const id = crypto.randomUUID();
    setSessionId(id);
  };

  const useCurrentSessionId = () => {
    const currentId = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID) || crypto.randomUUID();
    if (!sessionStorage.getItem(STORAGE_KEYS.SESSION_ID)) {
      sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, currentId);
    }
    setSessionId(currentId);
    setUseCurrentSession(true);
  };

  const handleSave = () => {
    if (!sessionId.trim()) {
      onError('Please provide a session ID');
      return;
    }

    const config: DesignatedReleaseConfig = {
      type: 'designated',
      designatedSessionId: sessionId.trim(),
      message: message.trim() || undefined
    };

    onSave(config);
  };

  return (
    <div className="release-setup designated-setup">
      <div className="setup-header">
        <h3>🧑‍⚖️ Designated Recipient Setup</h3>
        <p>Only allow decryption in a specific browser session (like a digital executor)</p>
      </div>

      <div className="setup-content">
        <div className="form-section">
          <label htmlFor="session-id">Designated Session ID</label>
          <div className="session-id-controls">
            <input
              id="session-id"
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Enter or generate a unique session ID"
              className="session-id-input"
            />
            <button 
              type="button" 
              onClick={generateSessionId}
              className="generate-button"
            >
              Generate New
            </button>
          </div>
          <div className="session-options">
            <button 
              type="button" 
              onClick={useCurrentSessionId}
              className={`current-session-button ${useCurrentSession ? 'active' : ''}`}
            >
              Use Current Browser Session
            </button>
          </div>
          <div className="form-hint">
            The person with this session ID will be the only one who can view the decrypted file.
            Share this ID securely with your designated recipient.
          </div>
        </div>

        <div className="form-section">
          <label htmlFor="message">Message for Recipient (Optional)</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Optional message to display to the designated recipient..."
            rows={3}
            className="message-textarea"
          />
        </div>

        <div className="security-notice">
          <div className="notice-icon">🔒</div>
          <div className="notice-content">
            <h4>How it works:</h4>
            <ul>
              <li>Only the browser with the matching session ID can decrypt</li>
              <li>Session ID is stored locally and never sent to any server</li>
              <li>Perfect for digital executor or power of attorney scenarios</li>
              <li>If the designated session is lost, the file cannot be recovered</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="setup-actions">
        <button onClick={onCancel} className="cancel-button">
          Cancel
        </button>
        <button onClick={handleSave} className="save-button">
          Configure Designated Release
        </button>
      </div>
    </div>
  );
}