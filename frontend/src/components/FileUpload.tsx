import React, { useState, useRef } from 'react';
import '../styles/FileUpload.css';

interface FileUploadProps {
  ticketId: string;
  onUploadSuccess?: (file: any) => void;
  onUploadError?: (error: string) => void;
  maxSizeMB?: number;
  acceptedTypes?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  ticketId,
  onUploadSuccess,
  onUploadError,
  maxSizeMB = 10,
  acceptedTypes = '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.zip'
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    // Validar tamanho
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      const error = `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`;
      onUploadError?.(error);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('attachment', file);

      const token = localStorage.getItem('internal_token') || localStorage.getItem('user_token');
      const headers: HeadersInit = {};

      if (token?.startsWith('Bearer')) {
        headers['Authorization'] = token;
      } else if (token) {
        headers['x-user-token'] = token;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/tickets/${ticketId}/attachments`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao fazer upload');
      }

      const data = await response.json();
      onUploadSuccess?.(data);
    } catch (error: any) {
      console.error('Upload error:', error);
      onUploadError?.(error.message || 'Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-dropzone ${dragActive ? 'active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="file-upload-loading">
            <div className="spinner"></div>
            <p>Enviando arquivo...</p>
          </div>
        ) : (
          <>
            <div className="file-upload-icon">📎</div>
            <p className="file-upload-text">
              <strong>Clique para selecionar</strong> ou arraste um arquivo
            </p>
            <p className="file-upload-hint">
              Tipos aceitos: PDF, DOC, TXT, Imagens, ZIP (máx. {maxSizeMB}MB)
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={uploading}
      />
    </div>
  );
};

export default FileUpload;
