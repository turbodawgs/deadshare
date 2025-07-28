// Release Options Utility Functions
// All client-side, zero-trust implementations

import { 
  ExtendedEncryptionResult,
  DesignatedReleaseConfig,
  PublicReleaseConfig,
  STORAGE_KEYS
} from '../types/releaseOptions';

// Extend Window interface for Arweave
declare global {
  interface Window {
    arweave?: any;
  }
}

export class ReleaseUtils {
  
  // DESIGNATED RELEASE
  static async storeForDesignatedSession(
    encryptionResult: ExtendedEncryptionResult,
    config: DesignatedReleaseConfig
  ): Promise<void> {
    // Store encrypted data with session binding
    const sessionData = {
      encryptedFile: Array.from(new Uint8Array(encryptionResult.encryptedFile.encryptedData)),
      iv: Array.from(encryptionResult.encryptedFile.iv),
      filename: encryptionResult.encryptedFile.filename,
      originalSize: encryptionResult.encryptedFile.originalSize,
      sessionId: config.designatedSessionId,
      message: config.message,
      timestamp: Date.now()
    };
    
    // Store in session storage (only accessible to this session)
    sessionStorage.setItem('deadshare_designated_file', JSON.stringify(sessionData));
  }

  static checkDesignatedAccess(sessionId: string): boolean {
    const currentSession = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
    return currentSession === sessionId;
  }

  // PUBLIC RELEASE - IPFS
  static async uploadToIPFS(
    encryptionResult: ExtendedEncryptionResult,
    config: PublicReleaseConfig
  ): Promise<string> {
    try {
      // This is pseudocode - you'll need to implement actual IPFS upload
      const fileData = new Uint8Array(encryptionResult.encryptedFile.encryptedData);
      
      // Use js-ipfs or IPFS HTTP API
      const formData = new FormData();
      const blob = new Blob([fileData], { type: 'application/octet-stream' });
      formData.append('file', blob, encryptionResult.encryptedFile.filename);
      
      // Upload via IPFS gateway (replace with actual endpoint)
      const response = await fetch('https://ipfs.infura.io:5001/api/v0/add', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      const ipfsHash = result.Hash;
      
      // Store the IPFS hash for reference
      const uploadRecord = {
        ipfsHash,
        filename: encryptionResult.encryptedFile.filename,
        uploadTime: Date.now(),
        publicMessage: config.publicMessage,
        makeSearchable: config.makeSearchable
      };
      
      localStorage.setItem('deadshare_ipfs_upload', JSON.stringify(uploadRecord));
      
      return ipfsHash;
    } catch (error) {
      throw new Error(`IPFS upload failed: ${error}`);
    }
  }

  // PUBLIC RELEASE - ARWEAVE
  static async uploadToArweave(
    encryptionResult: ExtendedEncryptionResult,
    config: PublicReleaseConfig
  ): Promise<string> {
    try {
      // This is pseudocode - requires Arweave JS SDK
      const fileData = new Uint8Array(encryptionResult.encryptedFile.encryptedData);
      
      if (!window.arweave) {
        throw new Error('Arweave not available. Please install the ArConnect extension.');
      }

      // Create Arweave transaction
      const transaction = await window.arweave.createTransaction({
        data: fileData
      });
      
      // Add tags
      transaction.addTag('Content-Type', 'application/octet-stream');
      transaction.addTag('App-Name', 'DeadShare');
      transaction.addTag('App-Version', '1.0');
      transaction.addTag('File-Name', encryptionResult.encryptedFile.filename);
      
      if (config.publicMessage) {
        transaction.addTag('Public-Message', config.publicMessage);
      }
      
      if (config.makeSearchable) {
        transaction.addTag('Searchable', 'true');
      }
      
      // Sign and submit (requires user wallet)
      await window.arweave.transactions.sign(transaction);
      const response = await window.arweave.transactions.post(transaction);
      
      if (response.status === 200) {
        const uploadRecord = {
          transactionId: transaction.id,
          filename: encryptionResult.encryptedFile.filename,
          uploadTime: Date.now(),
          publicMessage: config.publicMessage
        };
        
        localStorage.setItem('deadshare_arweave_upload', JSON.stringify(uploadRecord));
        return transaction.id;
      } else {
        throw new Error('Arweave upload failed');
      }
    } catch (error) {
      throw new Error(`Arweave upload failed: ${error}`);
    }
  }

  // PUBLIC RELEASE - CUSTOM ENDPOINT
  static async uploadToCustomEndpoint(
    encryptionResult: ExtendedEncryptionResult,
    config: PublicReleaseConfig
  ): Promise<string> {
    if (!config.customEndpoint) {
      throw new Error('Custom endpoint not configured');
    }
    
    try {
      const fileData = new Uint8Array(encryptionResult.encryptedFile.encryptedData);
      const formData = new FormData();
      const blob = new Blob([fileData], { type: 'application/octet-stream' });
      formData.append('file', blob, encryptionResult.encryptedFile.filename);
      
      if (config.publicMessage) {
        formData.append('message', config.publicMessage);
      }
      
      const response = await fetch(config.customEndpoint, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      const uploadUrl = result.url || result.id;
      
      const uploadRecord = {
        uploadUrl,
        endpoint: config.customEndpoint,
        filename: encryptionResult.encryptedFile.filename,
        uploadTime: Date.now()
      };
      
      localStorage.setItem('deadshare_custom_upload', JSON.stringify(uploadRecord));
      return uploadUrl;
    } catch (error) {
      throw new Error(`Custom upload failed: ${error}`);
    }
  }

  // MULTI-RECIPIENT RELEASE
  static async encryptForRecipient(
    encryptionResult: ExtendedEncryptionResult,
    recipient: { id: string; name?: string; publicKey: string }
  ): Promise<void> {
    try {
      // Generate a new symmetric key for this recipient
      const recipientKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      // Export the symmetric key
      const keyData = await crypto.subtle.exportKey('raw', recipientKey);
      
      // Import recipient's public key
      const publicKey = await this.importPublicKey(recipient.publicKey);
      
      // Encrypt the symmetric key with recipient's public key
      const encryptedKey = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        keyData
      );
      
      // Encrypt the file data with the recipient's symmetric key
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        recipientKey,
        encryptionResult.encryptedFile.encryptedData
      );
      
      // Create recipient package
      const recipientPackage = {
        recipientId: recipient.id,
        recipientName: recipient.name,
        encryptedKey: Array.from(new Uint8Array(encryptedKey)),
        encryptedData: Array.from(new Uint8Array(encryptedData)),
        iv: Array.from(iv),
        filename: encryptionResult.encryptedFile.filename,
        originalSize: encryptionResult.encryptedFile.originalSize,
        createdAt: Date.now()
      };
      
      // Store the recipient package
      const packageJson = JSON.stringify(recipientPackage);
      const packageBlob = new Blob([packageJson], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(packageBlob);
      
      // Auto-download the package for this recipient
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${recipient.name || 'recipient'}-${recipient.id.substring(0, 8)}.deadshare`;
      link.click();
      
      URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      throw new Error(`Failed to encrypt for recipient: ${error}`);
    }
  }

  static async importPublicKey(publicKeyPem: string): Promise<CryptoKey> {
    // Remove PEM headers and whitespace
    const pemContents = publicKeyPem
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s/g, '');
    
    // Convert base64 to ArrayBuffer
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    // Import the key
    return await crypto.subtle.importKey(
      'spki',
      binaryDer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt']
    );
  }

  // TIMED RELEASE
  static checkTimedRelease(): { canDecrypt: boolean; timeRemaining?: number } {
    const timerStateStr = localStorage.getItem(STORAGE_KEYS.TIMER_STATE);
    if (!timerStateStr) {
      return { canDecrypt: true };
    }
    
    try {
      const timerState = JSON.parse(timerStateStr);
      const now = Date.now();
      const timeRemaining = timerState.triggerTimestamp - now;
      
      if (timeRemaining <= 0) {
        // Timer expired, clear the state
        localStorage.removeItem(STORAGE_KEYS.TIMER_STATE);
        return { canDecrypt: true };
      }
      
      return { canDecrypt: false, timeRemaining };
    } catch {
      return { canDecrypt: true };
    }
  }

  // BURN AFTER READ
  static checkBurnState(): { 
    canView: boolean; 
    viewsRemaining?: number; 
    shouldBurn?: boolean;
    warningMessage?: string;
  } {
    const burnStateStr = localStorage.getItem(STORAGE_KEYS.BURN_STATE);
    if (!burnStateStr) {
      return { canView: true };
    }
    
    try {
      const burnState = JSON.parse(burnStateStr);
      const viewsRemaining = burnState.maxViews - burnState.viewCount;
      
      if (viewsRemaining <= 0) {
        // No views remaining
        this.burnFile();
        return { 
          canView: false, 
          viewsRemaining: 0,
          shouldBurn: true,
          warningMessage: burnState.warningMessage
        };
      }
      
      return { 
        canView: true, 
        viewsRemaining,
        warningMessage: burnState.warningMessage
      };
    } catch {
      return { canView: true };
    }
  }

  static recordView(): void {
    const burnStateStr = localStorage.getItem(STORAGE_KEYS.BURN_STATE);
    if (!burnStateStr) return;
    
    try {
      const burnState = JSON.parse(burnStateStr);
      burnState.viewCount += 1;
      
      if (burnState.viewCount >= burnState.maxViews) {
        this.burnFile();
      } else {
        localStorage.setItem(STORAGE_KEYS.BURN_STATE, JSON.stringify(burnState));
      }
    } catch {
      // Handle error silently
    }
  }

  static recordDownload(): boolean {
    const burnStateStr = localStorage.getItem(STORAGE_KEYS.BURN_STATE);
    if (!burnStateStr) return false;
    
    try {
      const burnState = JSON.parse(burnStateStr);
      
      if (burnState.burnOnDownload) {
        this.burnFile();
        return true; // File was burned
      }
      
      // Count download as a view
      this.recordView();
      return false;
    } catch {
      return false;
    }
  }

  static burnFile(): void {
    // Clear all burn-related data and file data
    localStorage.removeItem(STORAGE_KEYS.BURN_STATE);
    sessionStorage.removeItem('deadshare_decrypted_file');
    sessionStorage.removeItem('deadshare_file_data');
    
    // Clear any other sensitive data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('deadshare_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Trigger garbage collection if available
    if ('gc' in window && typeof window.gc === 'function') {
      window.gc();
    }
  }

  // UTILITY FUNCTIONS
  static generateSessionId(): string {
    return crypto.randomUUID();
  }

  static clearAllReleaseData(): void {
    const keys = [
      STORAGE_KEYS.RELEASE_CONFIG,
      STORAGE_KEYS.BURN_STATE,
      STORAGE_KEYS.TIMER_STATE
    ];
    
    keys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }
}