import React, { useState, useRef } from 'react';
import axios from 'axios';
import '../styles/DocumentUploader.css';

interface Document {
  filename: string;
  url: string;
  type: string;
  description: string;
  uploaded_at: string;
  size: number;
  mimetype: string;
}

interface DocumentUploaderProps {
  equipmentId: string;
  documents: Document[];
  onDocumentsChange: (documents: Document[]) => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ 
  equipmentId, 
  documents, 
  onDocumentsChange 
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [documentType, setDocumentType] = useState('invoice');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentTypes = [
    { value: 'invoice', label: '🧾 Nota Fiscal', icon: '🧾' },
    { value: 'manual', label: '📖 Manual', icon: '📖' },
    { value: 'warranty', label: '🛡️ Garantia', icon: '🛡️' },
    { value: 'receipt', label: '🧾 Recibo', icon: '🧾' },
    { value: 'other', label: '📄 Outro', icon: '📄' }
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    setError('');

    // Validação
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];

    if (!validTypes.includes(file.type)) {
      setError('Tipo de arquivo inválido. Use PDF, DOC, DOCX, XLS, XLSX ou TXT.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    // Upload
    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', documentType);
    formData.append('description', description || getDefaultDescription(documentType));

    try {
      setUploading(true);
      const token = localStorage.getItem('token');

      await axios.post(
        `http://localhost:3001/api/inventory/equipment/${equipmentId}/document`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Buscar documentos atualizados
      const docsResponse = await axios.get(
        `http://localhost:3001/api/inventory/equipment/${equipmentId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (docsResponse.data.documents) {
        const docs = typeof docsResponse.data.documents === 'string' 
          ? JSON.parse(docsResponse.data.documents) 
          : docsResponse.data.documents;
        onDocumentsChange(docs);
      }

      // Limpar formulário
      setDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err: any) {
      console.error('Erro ao fazer upload:', err);
      setError(err.response?.data?.error || 'Erro ao fazer upload do documento');
    } finally {
      setUploading(false);
    }
  };

  const getDefaultDescription = (type: string): string => {
    const descriptions: { [key: string]: string } = {
      invoice: 'Nota fiscal de compra',
      manual: 'Manual do usuário',
      warranty: 'Termo de garantia',
      receipt: 'Recibo de compra',
      other: 'Documento'
    };
    return descriptions[type] || 'Documento';
  };

  const getFileIcon = (mimetype: string): string => {
    if (mimetype.includes('pdf')) return '📕';
    if (mimetype.includes('word')) return '📘';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📗';
    if (mimetype.includes('text')) return '📄';
    return '📄';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeLabel = (type: string): string => {
    const typeObj = documentTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : '📄 Outro';
  };

  return (
    <div className="document-uploader">
      <h3>📄 Documentos</h3>

      {error && (
        <div className="upload-error">
          ⚠️ {error}
        </div>
      )}

      {/* Upload Form */}
      <div className="upload-form">
        <div className="form-row">
          <div className="form-group">
            <label>Tipo de Documento</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="form-select"
              disabled={uploading}
            >
              {documentTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Descrição (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Nota fiscal nº 12345"
              className="form-input"
              disabled={uploading}
            />
          </div>
        </div>

        <div className="upload-button-area">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
            className="file-input"
            disabled={uploading}
          />
          <button
            className="btn-upload"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? '⏳ Enviando...' : '📤 Selecionar Arquivo'}
          </button>
          <p className="upload-hint">PDF, DOC, XLS ou TXT - Máx. 10MB</p>
        </div>
      </div>

      {/* Documents List */}
      {documents.length > 0 ? (
        <div className="documents-list">
          {documents.map((doc, index) => (
            <div key={index} className="document-item">
              <div className="document-icon">
                {getFileIcon(doc.mimetype)}
              </div>
              <div className="document-info">
                <div className="document-header">
                  <span className="document-type">{getTypeLabel(doc.type)}</span>
                  <span className="document-size">{formatFileSize(doc.size)}</span>
                </div>
                <div className="document-description">{doc.description}</div>
                <div className="document-meta">
                  <span>{formatDate(doc.uploaded_at)}</span>
                </div>
              </div>
              <div className="document-actions">
                <button
                  className="btn-download"
                  onClick={() => window.open(doc.url, '_blank')}
                >
                  ⬇️ Baixar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-documents">
          <p>Nenhum documento adicionado ainda</p>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;
