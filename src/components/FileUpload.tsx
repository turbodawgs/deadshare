import { useCallback, useState } from 'react';
import { FileUploadState } from '../types';
import './FileUpload.css';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled = false }) => {
  const [uploadState, setUploadState] = useState<FileUploadState>({
    file: null,
    isUploaded: false,
    error: null
  });

  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = useCallback((file: File | null) => {
    if (!file) {
      setUploadState({
        file: null,
        isUploaded: false,
        error: null
      });
      return;
    }

    // Validate file size (max 100MB for demo)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadState({
        file: null,
        isUploaded: false,
        error: 'File size exceeds 100MB limit'
      });
      return;
    }

    setUploadState({
      file,
      isUploaded: true,
      error: null
    });

    onFileSelect(file);
  }, [onFileSelect]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    handleFileChange(file);
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      handleFileChange(files[0]);
    }
  }, [disabled, handleFileChange]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) {
      setDragActive(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clearFile = () => {
    setUploadState({
      file: null,
      isUploaded: false,
      error: null
    });
  };

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-area ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''} ${uploadState.error ? 'error' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {!uploadState.isUploaded ? (
          <>
            <div className="upload-icon">📁</div>
            <div className="upload-text">
              <p>Drop your file here or click to browse</p>
              <p className="upload-hint">Maximum file size: 100MB</p>
            </div>
            <input
              type="file"
              onChange={handleInputChange}
              disabled={disabled}
              className="file-input"
              accept="*/*"
            />
          </>
        ) : (
          <div className="file-info">
            <div className="file-icon">📄</div>
            <div className="file-details">
              <div className="file-name">{uploadState.file?.name}</div>
              <div className="file-size">{uploadState.file ? formatFileSize(uploadState.file.size) : ''}</div>
            </div>
            <button
              onClick={clearFile}
              className="clear-button"
              disabled={disabled}
              title="Remove file"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {uploadState.error && (
        <div className="error-message">
          WARNING: {uploadState.error}
        </div>
      )}

    </div>
  );
};