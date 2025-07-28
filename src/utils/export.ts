import JSZip from 'jszip';
import QRCode from 'qrcode';
import { EncryptionResult, KeyShare, EncryptedFile } from '../types';
import { ShamirUtils } from './shamir';

export interface ExportOptions {
  includeEncryptedFile: boolean;
  includeQRCodes: boolean;
  includeReadme: boolean;
}

export class ExportUtils {
  /**
   * Creates a ZIP archive containing key shares and optional encrypted file
   * @param result - The encryption result containing shares and encrypted file
   * @param options - Export options to customize what's included
   * @returns Promise<Blob> - The ZIP file as a blob
   */
  static async createSecureBundle(
    result: EncryptionResult,
    options: ExportOptions
  ): Promise<Blob> {
    const zip = new JSZip();

    // Add key shares
    for (const share of result.keyShares) {
      const shareFile = ShamirUtils.createShareFile(share);
      const shareContent = await shareFile.text();
      zip.file(`key-share-${share.id}.json`, shareContent);
    }

    // Add QR codes if requested
    if (options.includeQRCodes) {
      const qrFolder = zip.folder('qr-codes');
      if (qrFolder) {
        for (const share of result.keyShares) {
          const qrCodeDataUrl = await this.generateQRCodeForShare(share);
          const base64Data = qrCodeDataUrl.split(',')[1];
          qrFolder.file(`key-share-${share.id}-qr.png`, base64Data, { base64: true });
        }
      }
    }

    // Add encrypted file if requested
    if (options.includeEncryptedFile) {
      const encryptedFileContent = this.serializeEncryptedFile(result.encryptedFile);
      zip.file(`encrypted-${result.encryptedFile.filename}.json`, encryptedFileContent);
    }

    // Add README if requested
    if (options.includeReadme) {
      const readme = this.generateReadme(result, options);
      zip.file('README.txt', readme);
    }

    return await zip.generateAsync({ type: 'blob' });
  }

  /**
   * Generates a QR code for a key share
   * @param share - The key share to encode
   * @returns Promise<string> - Data URL of the QR code image
   */
  static async generateQRCodeForShare(share: KeyShare): Promise<string> {
    const shareData = {
      application: 'DeadShare',
      version: '2.0.0',
      id: share.id,
      share: ShamirUtils.shareToBase64(share.share),
    };

    const shareJson = JSON.stringify(shareData);
    
    return await QRCode.toDataURL(shareJson, {
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
  }

  /**
   * Serializes an encrypted file to JSON format
   * @param encryptedFile - The encrypted file to serialize
   * @returns string - JSON representation of the encrypted file
   */
  static serializeEncryptedFile(encryptedFile: EncryptedFile): string {
    const serialized = {
      application: 'DeadShare',
      version: '2.0.0',
      encryptedData: Array.from(new Uint8Array(encryptedFile.encryptedData))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''),
      iv: Array.from(encryptedFile.iv),
      filename: encryptedFile.filename,
      originalSize: encryptedFile.originalSize,
      created: new Date().toISOString(),
    };

    return JSON.stringify(serialized, null, 2);
  }

  /**
   * Generates a README file with usage instructions
   * @param result - The encryption result
   * @param options - Export options used
   * @returns string - README content
   */
  static generateReadme(result: EncryptionResult, options: ExportOptions): string {
    const readme = `DeadShare Secure Bundle
=======================

This archive contains encrypted file shares created with DeadShare, a privacy-focused
file sharing application that uses client-side AES-256 encryption and Shamir's Secret
Sharing for secure key distribution.

Contents:
${result.keyShares.map(share => `- key-share-${share.id}.json`).join('\n')}${options.includeQRCodes ? `
${result.keyShares.map(share => `- qr-codes/key-share-${share.id}-qr.png`).join('\n')}` : ''}${options.includeEncryptedFile ? `
- encrypted-${result.encryptedFile.filename}.json` : ''}

Configuration:
- Total shares: ${result.config.totalShares}
- Threshold: ${result.config.threshold} (minimum shares needed to decrypt)
- Original filename: ${result.encryptedFile.filename}
- Original size: ${(result.encryptedFile.originalSize / 1024 / 1024).toFixed(2)} MB

Instructions:
============

To decrypt the file:
1. Go to the DeadShare application
2. Select "Decrypt File" mode
3. Upload the encrypted file (encrypted-*.json)
4. Upload at least ${result.config.threshold} key share files (key-share-*.json)
5. Click "Decrypt File" to recover the original file

Security Notes:
- Keep key shares separate and secure
- Each share alone reveals nothing about the original file
- At least ${result.config.threshold} shares are required to decrypt the file
- All encryption/decryption happens locally in your browser
- No data is ever sent to any server

QR Codes (if included):
- QR codes contain the same data as the JSON share files
- Scan with a QR code reader to import share data
- Useful for mobile devices or when file transfer is difficult

Generated: ${new Date().toISOString()}
DeadShare Version: 2.0.0

For more information, visit: https://github.com/your-repo/deadshare
`;

    return readme;
  }

  /**
   * Downloads a blob as a file
   * @param blob - The blob to download
   * @param filename - The filename for the download
   */
  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Creates individual share downloads with QR codes
   * @param shares - Array of key shares
   * @param includeQR - Whether to include QR codes
   * @returns Promise<Blob[]> - Array of individual share files
   */
  static async createIndividualShares(
    shares: KeyShare[],
    includeQR: boolean = false
  ): Promise<{ filename: string; blob: Blob }[]> {
    const files: { filename: string; blob: Blob }[] = [];

    for (const share of shares) {
      // Add JSON share file
      const shareFile = ShamirUtils.createShareFile(share);
      files.push({
        filename: `key-share-${share.id}.json`,
        blob: shareFile,
      });

      // Add QR code if requested
      if (includeQR) {
        const qrCodeDataUrl = await this.generateQRCodeForShare(share);
        const response = await fetch(qrCodeDataUrl);
        const qrBlob = await response.blob();
        files.push({
          filename: `key-share-${share.id}-qr.png`,
          blob: qrBlob,
        });
      }
    }

    return files;
  }

  /**
   * Validates export options
   * @param options - Options to validate
   * @returns boolean - True if options are valid
   */
  static validateExportOptions(options: ExportOptions): boolean {
    return typeof options.includeEncryptedFile === 'boolean' &&
           typeof options.includeQRCodes === 'boolean' &&
           typeof options.includeReadme === 'boolean';
  }

  /**
   * Gets the estimated ZIP file size
   * @param result - The encryption result
   * @param options - Export options
   * @returns number - Estimated size in bytes
   */
  static estimateZipSize(result: EncryptionResult, options: ExportOptions): number {
    let size = 0;

    // Key shares (approximately 500 bytes each)
    size += result.keyShares.length * 500;

    // QR codes (approximately 10KB each)
    if (options.includeQRCodes) {
      size += result.keyShares.length * 10 * 1024;
    }

    // Encrypted file
    if (options.includeEncryptedFile) {
      size += result.encryptedFile.encryptedData.byteLength;
    }

    // README (approximately 2KB)
    if (options.includeReadme) {
      size += 2 * 1024;
    }

    // ZIP overhead (approximately 10%)
    return Math.round(size * 1.1);
  }
}