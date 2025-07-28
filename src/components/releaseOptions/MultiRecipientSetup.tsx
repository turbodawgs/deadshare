import { useState } from 'react';
import { MultiRecipientConfig } from '../../types/releaseOptions';

interface MultiRecipientSetupProps {
  onSave: (config: MultiRecipientConfig) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

interface Recipient {
  id: string;
  name?: string;
  publicKey: string;
}

export function MultiRecipientSetup({ onSave, onCancel, onError }: MultiRecipientSetupProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [currentRecipient, setCurrentRecipient] = useState({
    name: '',
    publicKey: ''
  });
  const [isAddingRecipient, setIsAddingRecipient] = useState(false);

  const generateRecipientId = () => crypto.randomUUID();

  const validatePublicKey = (key: string): boolean => {
    // Basic validation - in production, you'd want more robust validation
    const trimmedKey = key.trim();
    
    // Check for PEM format
    if (trimmedKey.includes('BEGIN PUBLIC KEY') && trimmedKey.includes('END PUBLIC KEY')) {
      return true;
    }
    
    // Check for raw base64 (simplified)
    if (trimmedKey.length > 100 && /^[A-Za-z0-9+/=]+$/.test(trimmedKey)) {
      return true;
    }
    
    return false;
  };

  const addRecipient = () => {
    const { name, publicKey } = currentRecipient;
    
    if (!publicKey.trim()) {
      onError('Public key is required');
      return;
    }
    
    if (!validatePublicKey(publicKey)) {
      onError('Invalid public key format. Please provide a valid PEM or base64 encoded public key.');
      return;
    }
    
    // Check for duplicate keys
    if (recipients.some(r => r.publicKey.trim() === publicKey.trim())) {
      onError('This public key has already been added');
      return;
    }
    
    const newRecipient: Recipient = {
      id: generateRecipientId(),
      name: name.trim() || undefined,
      publicKey: publicKey.trim()
    };
    
    setRecipients(prev => [...prev, newRecipient]);
    setCurrentRecipient({ name: '', publicKey: '' });
    setIsAddingRecipient(false);
  };

  const removeRecipient = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
  };

  const handleSave = () => {
    if (recipients.length === 0) {
      onError('Please add at least one recipient');
      return;
    }

    if (recipients.length > 10) {
      onError('Maximum 10 recipients allowed');
      return;
    }

    const config: MultiRecipientConfig = {
      type: 'multi-recipient',
      recipients: recipients.map(r => ({
        id: r.id,
        name: r.name,
        publicKey: r.publicKey
      }))
    };

    onSave(config);
  };

  const handleImportFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      
      if (Array.isArray(imported)) {
        // Validate imported data
        const validRecipients = imported.filter(item => 
          item.publicKey && validatePublicKey(item.publicKey)
        );
        
        if (validRecipients.length === 0) {
          onError('No valid recipients found in the file');
          return;
        }
        
        const newRecipients = validRecipients.map(item => ({
          id: generateRecipientId(),
          name: item.name || undefined,
          publicKey: item.publicKey.trim()
        }));
        
        setRecipients(prev => [...prev, ...newRecipients]);
      }
    } catch (error) {
      onError('Invalid file format. Please provide a valid JSON file.');
    }
    
    // Reset file input
    event.target.value = '';
  };

  const exportRecipients = () => {
    const dataStr = JSON.stringify(recipients, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'recipients.json';
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="release-setup multi-recipient-setup">
      <div className="setup-header">
        <h3>👥 Multiple Recipients Setup</h3>
        <p>Encrypt the file separately for multiple recipients using their public keys</p>
      </div>

      <div className="setup-content">
        <div className="recipients-section">
          <div className="section-header">
            <h4>Recipients ({recipients.length})</h4>
            <div className="header-actions">
              <label className="import-button">
                📁 Import from File
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFromFile}
                  style={{ display: 'none' }}
                />
              </label>
              {recipients.length > 0 && (
                <button onClick={exportRecipients} className="export-button">
                  💾 Export List
                </button>
              )}
            </div>
          </div>

          <div className="recipients-list">
            {recipients.map((recipient) => (
              <div key={recipient.id} className="recipient-item">
                <div className="recipient-info">
                  <div className="recipient-name">
                    {recipient.name || 'Unnamed Recipient'}
                  </div>
                  <div className="recipient-key">
                    {recipient.publicKey.substring(0, 50)}...
                  </div>
                </div>
                <button
                  onClick={() => removeRecipient(recipient.id)}
                  className="remove-button"
                  title="Remove recipient"
                >
                  ×
                </button>
              </div>
            ))}
            
            {recipients.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <p>No recipients added yet</p>
                <p className="empty-hint">Add recipients to encrypt the file for each of them individually</p>
              </div>
            )}
          </div>
        </div>

        <div className="add-recipient-section">
          {!isAddingRecipient ? (
            <button
              onClick={() => setIsAddingRecipient(true)}
              className="add-recipient-button"
              disabled={recipients.length >= 10}
            >
              ADD: Add Recipient
            </button>
          ) : (
            <div className="add-recipient-form">
              <div className="form-group">
                <label htmlFor="recipient-name">Name (Optional)</label>
                <input
                  id="recipient-name"
                  type="text"
                  value={currentRecipient.name}
                  onChange={(e) => setCurrentRecipient(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Recipient name or identifier"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="recipient-key">Public Key *</label>
                <textarea
                  id="recipient-key"
                  value={currentRecipient.publicKey}
                  onChange={(e) => setCurrentRecipient(prev => ({ ...prev, publicKey: e.target.value }))}
                  placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                  rows={8}
                  className="public-key-input"
                />
                <div className="form-hint">
                  Paste the recipient's RSA or ECDSA public key in PEM format
                </div>
              </div>
              
              <div className="form-actions">
                <button
                  onClick={() => {
                    setIsAddingRecipient(false);
                    setCurrentRecipient({ name: '', publicKey: '' });
                  }}
                  className="cancel-button-small"
                >
                  Cancel
                </button>
                <button onClick={addRecipient} className="add-button">
                  Add Recipient
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="security-info">
          <div className="info-icon">🔒</div>
          <div className="info-content">
            <h4>How multi-recipient encryption works:</h4>
            <ul>
              <li>The file is encrypted once with a symmetric key</li>
              <li>The symmetric key is then encrypted with each recipient's public key</li>
              <li>Each recipient gets their own encrypted version they can decrypt</li>
              <li>Recipients cannot decrypt versions meant for others</li>
              <li>All encryption happens client-side</li>
            </ul>
          </div>
        </div>

        {recipients.length > 0 && (
          <div className="summary-info">
            <h4>Summary</h4>
            <p>
              The file will be encrypted for <strong>{recipients.length}</strong> recipient{recipients.length !== 1 ? 's' : ''}.
              Each will receive their own encrypted version that only they can decrypt.
            </p>
          </div>
        )}
      </div>

      <div className="setup-actions">
        <button onClick={onCancel} className="cancel-button">
          Cancel
        </button>
        <button 
          onClick={handleSave} 
          className="save-button"
          disabled={recipients.length === 0}
        >
          Configure Multi-Recipient Release
        </button>
      </div>
    </div>
  );
}