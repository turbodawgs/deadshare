import { split, combine } from 'shamirs-secret-sharing';
import { KeyShare } from '../types';
import { EncryptionUtils } from './encryption';

export class ShamirUtils {
  /**
   * Splits an encryption key into multiple shares using Shamir's Secret Sharing
   * @param key - The CryptoKey to split
   * @param threshold - Minimum number of shares needed to reconstruct the key
   * @param totalShares - Total number of shares to create
   * @returns Promise<KeyShare[]> - Array of key shares
   */
  static async splitKey(
    key: CryptoKey,
    threshold: number,
    totalShares: number
  ): Promise<KeyShare[]> {
    try {
      // Validate inputs
      if (threshold > totalShares) {
        throw new Error('Threshold cannot be greater than total shares');
      }
      if (threshold < 2) {
        throw new Error('Threshold must be at least 2');
      }
      if (totalShares > 255) {
        throw new Error('Total shares cannot exceed 255');
      }

      // Export the key to raw bytes
      const keyData = await EncryptionUtils.exportKey(key);
      
      // Convert ArrayBuffer to Uint8Array
      const keyBytes = new Uint8Array(keyData);

      // Split the key using Shamir's Secret Sharing
      const shares = split(keyBytes, { shares: totalShares, threshold });

      // Convert shares to our KeyShare format
      return shares.map((share: Uint8Array, index: number) => ({
        id: index + 1,
        share: share
      }));
    } catch (error) {
      throw new Error(`Failed to split key: ${error}`);
    }
  }

  /**
   * Reconstructs an encryption key from a subset of shares
   * @param shares - Array of key shares (must meet threshold requirement)
   * @returns Promise<CryptoKey> - The reconstructed encryption key
   */
  static async reconstructKey(shares: KeyShare[]): Promise<CryptoKey> {
    try {
      if (shares.length < 2) {
        throw new Error('At least 2 shares are required to reconstruct the key');
      }

      // Extract just the share Uint8Arrays for shamirs-secret-sharing
      const shareArrays = shares.map(s => s.share);

      // Combine the shares to reconstruct the key
      const reconstructedKeyBytes = combine(shareArrays);

      // Convert Uint8Array back to ArrayBuffer
      const keyData = reconstructedKeyBytes.buffer.slice(
        reconstructedKeyBytes.byteOffset,
        reconstructedKeyBytes.byteOffset + reconstructedKeyBytes.byteLength
      );

      // Import the key back to CryptoKey format
      return await EncryptionUtils.importKey(keyData);
    } catch (error) {
      throw new Error(`Failed to reconstruct key: ${error}`);
    }
  }

  /**
   * Validates that a set of shares can potentially reconstruct a key
   * @param shares - Array of key shares to validate
   * @returns boolean - True if shares appear valid
   */
  static validateShares(shares: KeyShare[]): boolean {
    try {
      if (!shares || shares.length === 0) {
        return false;
      }

      // Check that all shares have valid format
      for (const share of shares) {
        if (!share.share || !(share.share instanceof Uint8Array)) {
          return false;
        }
        if (!share.id || typeof share.id !== 'number') {
          return false;
        }
        // Check if share has reasonable length (should be > 0)
        if (share.share.length === 0) {
          return false;
        }
      }

      // Check for duplicate share IDs
      const shareIds = shares.map(s => s.id);
      const uniqueIds = new Set(shareIds);
      if (uniqueIds.size !== shareIds.length) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the minimum threshold required for a set of shares
   * @param shares - Array of key shares
   * @returns number | null - The threshold, or null if it cannot be determined
   */
  static getShareThreshold(shares: KeyShare[]): number | null {
    try {
      if (!shares || shares.length === 0) {
        return null;
      }

      // shamirs-secret-sharing doesn't encode threshold in shares
      // Return a conservative estimate based on available shares
      return Math.min(shares.length, 2);
    } catch (error) {
      return null;
    }
  }

  /**
   * Converts Uint8Array to base64 string for storage/transmission
   * @param share - The Uint8Array share to encode
   * @returns string - Base64 encoded share
   */
  static shareToBase64(share: Uint8Array): string {
    const binaryString = Array.from(share, byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
  }

  /**
   * Converts base64 string back to Uint8Array
   * @param base64Share - The base64 encoded share
   * @returns Uint8Array - Decoded share
   */
  static shareFromBase64(base64Share: string): Uint8Array {
    const binaryString = atob(base64Share);
    return new Uint8Array(Array.from(binaryString, char => char.charCodeAt(0)));
  }

  /**
   * Generates a QR code data URL for a share (for easy sharing)
   * @param share - The key share to encode
   * @returns string - Data URL for the QR code (placeholder implementation)
   */
  static generateQRCode(share: KeyShare): string {
    // Convert share to base64 for QR code
    const base64Share = this.shareToBase64(share.share);
    const shareText = `DeadShare Key Share #${share.id}: ${base64Share}`;
    return `data:text/plain;base64,${btoa(shareText)}`;
  }

  /**
   * Creates a downloadable file for a key share
   * @param share - The key share to save
   * @returns Blob - Downloadable blob containing the share
   */
  static createShareFile(share: KeyShare): Blob {
    const shareContent = JSON.stringify({
      id: share.id,
      share: this.shareToBase64(share.share), // Store as base64 in JSON
      application: 'DeadShare',
      version: '2.0.0',
      warning: 'This file contains a cryptographic key share. Keep it secure and private.',
      format: 'base64'
    }, null, 2);

    return new Blob([shareContent], { type: 'application/json' });
  }

  /**
   * Parses a share file back to a KeyShare object
   * @param file - The file containing the share data
   * @returns Promise<KeyShare> - The parsed key share
   */
  static async parseShareFile(file: File): Promise<KeyShare> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.id || !data.share) {
        throw new Error('Invalid share file format');
      }

      // Convert base64 back to Uint8Array
      const shareBytes = this.shareFromBase64(data.share);

      return {
        id: data.id,
        share: shareBytes
      };
    } catch (error) {
      throw new Error(`Failed to parse share file: ${error}`);
    }
  }

  /**
   * Creates a KeyShare from raw data (for testing or manual input)
   * @param id - Share ID
   * @param shareData - Raw share data as Uint8Array
   * @returns KeyShare - The formatted key share
   */
  static createKeyShare(id: number, shareData: Uint8Array): KeyShare {
    return {
      id,
      share: shareData
    };
  }

  /**
   * Splits a raw Uint8Array secret into shares (utility function)
   * @param secret - The raw bytes to split
   * @param threshold - Minimum shares needed to reconstruct
   * @param totalShares - Total shares to create
   * @returns Uint8Array[] - Array of share byte arrays
   */
  static splitRawBytes(
    secret: Uint8Array,
    threshold: number,
    totalShares: number
  ): Uint8Array[] {
    if (threshold > totalShares) {
      throw new Error('Threshold cannot be greater than total shares');
    }
    if (threshold < 2) {
      throw new Error('Threshold must be at least 2');
    }
    if (totalShares > 255) {
      throw new Error('Total shares cannot exceed 255');
    }

    return split(secret, { shares: totalShares, threshold });
  }

  /**
   * Combines raw share byte arrays back into the original secret
   * @param shareArrays - Array of share Uint8Arrays
   * @returns Uint8Array - The reconstructed secret
   */
  static combineRawShares(shareArrays: Uint8Array[]): Uint8Array {
    if (shareArrays.length < 2) {
      throw new Error('At least 2 shares are required to reconstruct the secret');
    }

    return combine(shareArrays);
  }
}