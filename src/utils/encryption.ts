import { EncryptedFile } from '../types';

export class EncryptionUtils {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12; // 96 bits for GCM

  /**
   * Generates a cryptographically secure random key for AES-256 encryption
   * @returns Promise<CryptoKey> - The generated encryption key
   */
  static async generateKey(): Promise<CryptoKey> {
    try {
      return await crypto.subtle.generateKey(
        {
          name: this.ALGORITHM,
          length: this.KEY_LENGTH,
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      throw new Error(`Failed to generate encryption key: ${error}`);
    }
  }

  /**
   * Generates a random initialization vector (IV) for encryption
   * @returns Uint8Array - The generated IV
   */
  static generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
  }

  /**
   * Encrypts a file using AES-256-GCM
   * @param file - The file to encrypt
   * @param key - The encryption key
   * @returns Promise<EncryptedFile> - The encrypted file data
   */
  static async encryptFile(file: File, key: CryptoKey): Promise<EncryptedFile> {
    try {
      const fileData = await this.fileToArrayBuffer(file);
      const iv = this.generateIV();

      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        fileData
      );

      return {
        encryptedData,
        iv,
        filename: file.name,
        originalSize: file.size,
      };
    } catch (error) {
      throw new Error(`Failed to encrypt file: ${error}`);
    }
  }

  /**
   * Decrypts an encrypted file using AES-256-GCM
   * @param encryptedFile - The encrypted file data
   * @param key - The decryption key
   * @returns Promise<ArrayBuffer> - The decrypted file data
   */
  static async decryptFile(
    encryptedFile: EncryptedFile,
    key: CryptoKey
  ): Promise<ArrayBuffer> {
    try {
      return await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: encryptedFile.iv,
        },
        key,
        encryptedFile.encryptedData
      );
    } catch (error) {
      throw new Error(`Failed to decrypt file: ${error}`);
    }
  }

  /**
   * Exports a CryptoKey to raw bytes
   * @param key - The key to export
   * @returns Promise<ArrayBuffer> - The raw key bytes
   */
  static async exportKey(key: CryptoKey): Promise<ArrayBuffer> {
    try {
      return await crypto.subtle.exportKey('raw', key);
    } catch (error) {
      throw new Error(`Failed to export key: ${error}`);
    }
  }

  /**
   * Imports raw key bytes back to a CryptoKey
   * @param keyData - The raw key bytes
   * @returns Promise<CryptoKey> - The imported key
   */
  static async importKey(keyData: ArrayBuffer): Promise<CryptoKey> {
    try {
      return await crypto.subtle.importKey(
        'raw',
        keyData,
        {
          name: this.ALGORITHM,
          length: this.KEY_LENGTH,
        },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      throw new Error(`Failed to import key: ${error}`);
    }
  }

  /**
   * Converts a File object to ArrayBuffer
   * @param file - The file to convert
   * @returns Promise<ArrayBuffer> - The file data as ArrayBuffer
   */
  private static fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Converts ArrayBuffer to hex string for debugging/display
   * @param buffer - The buffer to convert
   * @returns string - Hex representation of the buffer
   */
  static bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Converts hex string back to ArrayBuffer
   * @param hex - The hex string to convert
   * @returns ArrayBuffer - The converted buffer
   */
  static hexToBuffer(hex: string): ArrayBuffer {
    if (hex.length % 2 !== 0) {
      throw new Error('Invalid hex string length');
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes.buffer;
  }
}