import React, { useState, useRef } from 'react';
import api from '../services/api';
import ConfirmDialog from './ConfirmDialog';
import '../styles/PhotoUploader.css';

interface Photo {
  url: string;
  filename: string;
}

interface PhotoUploaderProps {
  equipmentId: string;
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
}

const PhotoUploader: React.FC<PhotoUploaderProps> = ({ equipmentId, photos, onPhotosChange }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; filename: string | null }>({ isOpen: false, filename: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    setError('');
    
    // Validação
    const file = files[0];
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!validTypes.includes(file.type)) {
      setError('Tipo de arquivo inválido. Use JPG, PNG, GIF ou WEBP.');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
      setError('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    // Upload
    const formData = new FormData();
    formData.append('equipmentPhoto', file);

    try {
      setUploading(true);
      
      const response = await api.post(
        `/inventory/equipment/${equipmentId}/photo`,
        formData
      );

      // Adicionar nova foto à lista
      const newPhoto: Photo = {
        url: response.data.url,
        filename: response.data.filename
      };
      
      onPhotosChange([...photos, newPhoto]);
      
    } catch (err: any) {
      console.error('Erro ao fazer upload:', err);
      setError(err.response?.data?.error || 'Erro ao fazer upload da foto');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    setDeleteConfirm({ isOpen: true, filename });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.filename) return;

    try {
      
      await api.delete(
        `/inventory/equipment/${equipmentId}/photo`,
        { data: { filename: deleteConfirm.filename } }
      );

      // Remover foto da lista
      onPhotosChange(photos.filter(p => p.filename !== deleteConfirm.filename));
      
    } catch (err: any) {
      console.error('Erro ao deletar foto:', err);
      setError(err.response?.data?.error || 'Erro ao deletar foto');
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="photo-uploader">
      <h3>📷 Fotos do Equipamento</h3>
      
      {error && (
        <div className="upload-error">
          ⚠️ {error}
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="upload-input"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleChange}
        />
        
        {uploading ? (
          <div className="upload-content">
            <div className="upload-spinner">⏳</div>
            <p>Fazendo upload...</p>
          </div>
        ) : (
          <div className="upload-content">
            <div className="upload-icon">📸</div>
            <p className="upload-text">
              Arraste uma foto aqui ou clique para selecionar
            </p>
            <p className="upload-hint">
              JPG, PNG, GIF ou WEBP - Máx. 10MB
            </p>
          </div>
        )}
      </div>

      {/* Photos Gallery */}
      {photos.length > 0 && (
        <div className="photos-gallery">
          {photos.map((photo, index) => (
            <div key={index} className="photo-item">
              <img
                src={photo.url}
                alt={`Foto ${index + 1}`}
                className="photo-thumbnail"
              />
              <div className="photo-overlay">
                <button
                  className="btn-view"
                  onClick={() => window.open(photo.url, '_blank')}
                >
                  👁️ Ver
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(photo.filename)}
                >
                  🗑️ Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && !uploading && (
        <div className="no-photos">
          <p>Nenhuma foto adicionada ainda</p>
        </div>
      )}      
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Deletar Foto"
        message="Tem certeza que deseja deletar esta foto? Esta ação não pode ser desfeita."
        confirmText="Deletar"
        cancelText="Cancelar"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, filename: null })}
      />    </div>
  );
};

export default PhotoUploader;
