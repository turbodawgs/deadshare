// Release Options Types for DeadShare
// Client-side only, zero-trust architecture

export type ReleaseOptionType = 
  | 'designated'     // Only show in chosen session (digital executor)
  | 'public'         // Upload to IPFS/public outlet
  | 'multi-recipient' // Encrypt separately for multiple recipients
  | 'timed'          // Add delay timer after threshold reached
  | 'burn-after-read'; // Single view/download then destroy

export interface DesignatedReleaseConfig {
  type: 'designated';
  designatedSessionId: string;
  sessionPublicKey?: string; // For additional encryption layer
  message?: string; // Optional message for the designated recipient
}

export interface PublicReleaseConfig {
  type: 'public';
  outlet: 'ipfs' | 'arweave' | 'custom';
  customEndpoint?: string;
  makeSearchable?: boolean;
  publicMessage?: string;
}

export interface MultiRecipientConfig {
  type: 'multi-recipient';
  recipients: Array<{
    id: string;
    name?: string;
    publicKey: string; // RSA/ECC public key for encryption
    encryptedVersion?: ArrayBuffer; // Stored after processing
  }>;
}

export interface TimedReleaseConfig {
  type: 'timed';
  delayHours: number;
  triggerTimestamp?: number; // Set when threshold is reached
  warningMessage?: string;
}

export interface BurnAfterReadConfig {
  type: 'burn-after-read';
  maxViews: number;
  viewCount: number;
  burnOnDownload: boolean;
  warningMessage?: string;
}

export type ReleaseConfig = 
  | DesignatedReleaseConfig
  | PublicReleaseConfig
  | MultiRecipientConfig
  | TimedReleaseConfig
  | BurnAfterReadConfig;

// Extended EncryptionResult with release options
export interface ExtendedEncryptionResult {
  encryptedFile: {
    encryptedData: ArrayBuffer;
    iv: Uint8Array;
    filename: string;
    originalSize: number;
  };
  keyShares: Array<{
    id: number;
    share: Uint8Array;
  }>;
  config: {
    threshold: number;
    totalShares: number;
  };
  releaseOptions?: ReleaseConfig;
  createdAt?: number;
  expiresAt?: number;
}

// State for release options management
export interface ReleaseOptionsState {
  isConfigured: boolean;
  selectedType: ReleaseOptionType | null;
  config: ReleaseConfig | null;
  isProcessing: boolean;
  error: string | null;
  thresholdReached: boolean;
  processingStage: 'idle' | 'preparing' | 'encrypting' | 'uploading' | 'complete';
}

// Events for the release system
export interface ReleaseEvent {
  type: 'threshold_reached' | 'timer_expired' | 'view_requested' | 'burn_triggered';
  timestamp: number;
  sessionId: string;
  metadata?: Record<string, any>;
}

// Client-side storage keys (localStorage/sessionStorage)
export const STORAGE_KEYS = {
  RELEASE_CONFIG: 'deadshare_release_config',
  SESSION_ID: 'deadshare_session_id',
  BURN_STATE: 'deadshare_burn_state',
  TIMER_STATE: 'deadshare_timer_state',
} as const;