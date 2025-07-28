import { useState } from 'react';
import { PublicReleaseConfig } from '../../types/releaseOptions';

interface PublicReleaseSetupProps {
  onSave: (config: PublicReleaseConfig) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

const OUTLET_OPTIONS = [
  {
    id: 'ipfs' as const,
    name: 'IPFS',
    description: 'InterPlanetary File System - decentralized storage',
    icon: '🌐',
    riskLevel: 'medium' as const,
    features: ['Immutable', 'Content-addressed', 'Censorship resistant']
  },
  {
    id: 'arweave' as const,
    name: 'Arweave',
    description: 'Permanent decentralized storage blockchain',
    icon: '🏛️',
    riskLevel: 'medium' as const,
    features: ['Permanent storage', 'Pay once, store forever', 'Web3 integration']
  },
  {
    id: 'custom' as const,
    name: 'Custom Endpoint',
    description: 'Your own server or service endpoint',
    icon: '🔧',
    riskLevel: 'high' as const,
    features: ['Full control', 'Custom implementation', 'Higher privacy risk']
  }
];

export function PublicReleaseSetup({ onSave, onCancel, onError }: PublicReleaseSetupProps) {
  const [outlet, setOutlet] = useState<'ipfs' | 'arweave' | 'custom'>('ipfs');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [makeSearchable, setMakeSearchable] = useState(false);
  const [publicMessage, setPublicMessage] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const selectedOutlet = OUTLET_OPTIONS.find(opt => opt.id === outlet)!;

  const handleSave = () => {
    if (!acknowledged) {
      onError('Please acknowledge the privacy implications');
      return;
    }

    if (outlet === 'custom' && !customEndpoint.trim()) {
      onError('Please provide a custom endpoint URL');
      return;
    }

    if (outlet === 'custom' && !isValidUrl(customEndpoint)) {
      onError('Please provide a valid URL for the custom endpoint');
      return;
    }

    const config: PublicReleaseConfig = {
      type: 'public',
      outlet,
      customEndpoint: outlet === 'custom' ? customEndpoint.trim() : undefined,
      makeSearchable,
      publicMessage: publicMessage.trim() || undefined
    };

    onSave(config);
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="release-setup public-setup">
      <div className="setup-header">
        <h3>🌐 Public Release Setup</h3>
        <p>Upload the decrypted file to a public outlet for anyone to access</p>
        <div className="risk-warning">
          <span className="warning-icon">⚠️</span>
          <strong>HIGH PRIVACY RISK:</strong> File will be publicly accessible
        </div>
      </div>

      <div className="setup-content">
        <div className="form-section">
          <label>Select Public Outlet</label>
          <div className="outlet-grid">
            {OUTLET_OPTIONS.map((option) => (
              <div
                key={option.id}
                className={`outlet-card ${outlet === option.id ? 'selected' : ''} risk-${option.riskLevel}`}
                onClick={() => setOutlet(option.id)}
              >
                <div className="outlet-header">
                  <span className="outlet-icon">{option.icon}</span>
                  <h4>{option.name}</h4>
                </div>
                <p className="outlet-description">{option.description}</p>
                <div className="outlet-features">
                  {option.features.map(feature => (
                    <span key={feature} className="feature-tag">
                      {feature}
                    </span>
                  ))}
                </div>
                <div className={`risk-indicator risk-${option.riskLevel}`}>
                  Risk: {option.riskLevel}
                </div>
              </div>
            ))}
          </div>
        </div>

        {outlet === 'custom' && (
          <div className="form-section">
            <label htmlFor="custom-endpoint">Custom Endpoint URL</label>
            <input
              id="custom-endpoint"
              type="url"
              value={customEndpoint}
              onChange={(e) => setCustomEndpoint(e.target.value)}
              placeholder="https://your-server.com/upload"
              className="endpoint-input"
            />
            <div className="form-hint">
              The endpoint should accept POST requests with file uploads.
              You are responsible for implementing the server-side logic.
            </div>
          </div>
        )}

        <div className="form-section">
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={makeSearchable}
                onChange={(e) => setMakeSearchable(e.target.checked)}
              />
              <span className="checkbox-text">
                Make file searchable/discoverable
              </span>
            </label>
          </div>
          <div className="form-hint">
            If enabled, adds metadata to help others find your file.
            Increases discoverability but reduces privacy.
          </div>
        </div>

        <div className="form-section">
          <label htmlFor="public-message">Public Message (Optional)</label>
          <textarea
            id="public-message"
            value={publicMessage}
            onChange={(e) => setPublicMessage(e.target.value)}
            placeholder="Message to display alongside the public file..."
            rows={3}
            className="message-textarea"
          />
        </div>

        <div className="outlet-info">
          <h4>Selected Outlet: {selectedOutlet.name}</h4>
          <div className="info-content">
            <p>{selectedOutlet.description}</p>
            <div className="technical-details">
              {outlet === 'ipfs' && (
                <>
                  <p><strong>Technical:</strong> Uses js-ipfs or Kubo gateway</p>
                  <p><strong>Access:</strong> Files accessible via IPFS hash</p>
                  <p><strong>Permanence:</strong> Depends on network pinning</p>
                </>
              )}
              {outlet === 'arweave' && (
                <>
                  <p><strong>Technical:</strong> Uses Arweave JS SDK</p>
                  <p><strong>Access:</strong> Files accessible via transaction ID</p>
                  <p><strong>Cost:</strong> Requires AR tokens for upload</p>
                </>
              )}
              {outlet === 'custom' && (
                <>
                  <p><strong>Technical:</strong> HTTP POST to your endpoint</p>
                  <p><strong>Control:</strong> Full control over storage</p>
                  <p><strong>Responsibility:</strong> You handle all aspects</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="privacy-acknowledgment">
          <div className="acknowledgment-box">
            <label className="checkbox-label large">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                required
              />
              <span className="checkbox-text">
                <strong>I understand and acknowledge:</strong>
                <ul>
                  <li>The file will be publicly accessible to anyone</li>
                  <li>Once uploaded, I cannot control who accesses it</li>
                  <li>The file may be cached, archived, or redistributed</li>
                  <li>This is irreversible - I cannot "unpublish" the file</li>
                  <li>I am responsible for any legal implications</li>
                </ul>
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="setup-actions">
        <button onClick={onCancel} className="cancel-button">
          Cancel
        </button>
        <button 
          onClick={handleSave} 
          className="save-button dangerous"
          disabled={!acknowledged}
        >
          Configure Public Release
        </button>
      </div>
    </div>
  );
}