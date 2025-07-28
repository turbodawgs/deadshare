export interface EncryptedFile {
  encryptedData: ArrayBuffer;
  iv: Uint8Array;
  filename: string;
  originalSize: number;
}

export interface KeyShare {
  id: number;
  share: Uint8Array;
}

export interface ShamirConfig {
  threshold: number;
  totalShares: number;
}

export interface EncryptionResult {
  encryptedFile: EncryptedFile;
  keyShares: KeyShare[];
  config: ShamirConfig;
  releaseOptions?: import('./releaseOptions').ReleaseConfig;
  createdAt?: number;
  expiresAt?: number;
}

export interface FileUploadState {
  file: File | null;
  isUploaded: boolean;
  error: string | null;
}

export interface EncryptionState {
  isEncrypting: boolean;
  isComplete: boolean;
  error: string | null;
  result: EncryptionResult | null;
}