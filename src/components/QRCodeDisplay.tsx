import { useState, useEffect } from 'react';
import { KeyShare } from '../types';
import { ExportUtils } from '../utils/export';

interface QRCodeDisplayProps {
  share: KeyShare;
  className?: string;
}

export function QRCodeDisplay({ share, className = '' }: QRCodeDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const generateQR = async () => {
      setIsLoading(true);
      setError('');
      try {
        const url = await ExportUtils.generateQRCodeForShare(share);
        setQrCodeUrl(url);
      } catch (err) {
        setError('Failed to generate QR code');
        console.error('QR code generation error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    generateQR();
  }, [share]);

  if (isLoading) {
    return (
      <div className={`qr-code-display loading ${className}`}>
        <div className="qr-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Generating QR code...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`qr-code-display error ${className}`}>
        <div className="qr-error">
          <div className="error-icon">Error:</div>
          <div className="error-text">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`qr-code-display ${className}`}>
      <div className="qr-code-container">
        <img 
          src={qrCodeUrl} 
          alt={`QR code for key share ${share.id}`}
          className="qr-code-image"
        />
        <div className="qr-code-info">
          <div className="qr-title">Share #{share.id}</div>
          <div className="qr-hint">Scan to import</div>
        </div>
      </div>
    </div>
  );
}