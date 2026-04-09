import React, { useState, useRef } from 'react';
import api from '../services/api';
import ConfirmDialog from './ConfirmDialog';
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
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; doc: Document | null }>({ 
    isOpen: false, 
    doc: null 
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentTypes = [
    { value: 'signed_term', label: '📝 Termo Assinado', icon: '📝' },
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

      const uploadResponse = await api.post(
        `/inventory/equipment/${equipmentId}/document`,
        formData
      );

      console.log('✅ Upload response:', uploadResponse.data);

      // Buscar documentos atualizados do endpoint correto
      const docsResponse = await api.get(
        `/inventory/equipment/${equipmentId}/documents`
      );

      console.log('📄 Documents response:', docsResponse.data);

      const docs = docsResponse.data.documents || [];
      console.log('📝 Setting documents:', docs);
      
      onDocumentsChange(docs);

      // Limpar formulário
      setDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err: any) {
      console.error('❌ Erro ao fazer upload:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || 'Erro ao fazer upload do documento');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await api.get(
        `/inventory/equipment/${equipmentId}/document/${doc.filename}`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
      window.open(doc.url, '_blank');
    }
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

  const getDefaultDescription = (type: string): string => {
    const descriptions: { [key: string]: string } = {
      signed_term: 'Termo de responsabilidade assinado',
      invoice: 'Nota fiscal de compra',
      manual: 'Manual do usuário',
      warranty: 'Termo de garantia',
      receipt: 'Recibo de compra',
      other: 'Documento'
    };
    return descriptions[type] || 'Documento';
  };

  const handleDelete = async (doc: Document) => {
    setDeleteConfirm({ isOpen: true, doc });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.doc) return;

    const doc = deleteConfirm.doc;

    try {
      // Remover documento da lista
      const updatedDocs = documents.filter(d => d.filename !== doc.filename);
      
      // Atualizar no banco
      await api.put(
        `/inventory/equipment/${equipmentId}/documents`,
        { documents: updatedDocs }
      );

      console.log('✅ Document deleted:', doc.filename);
      onDocumentsChange(updatedDocs);
      setDeleteConfirm({ isOpen: false, doc: null });
    } catch (err: any) {
      console.error('❌ Erro ao excluir documento:', err);
      setError('Erro ao excluir documento. Tente novamente.');
      setDeleteConfirm({ isOpen: false, doc: null });
    }
  };

  const getTypeLabel = (type: string): string => {
    const typeObj = documentTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : '📄 Outro';
  };

  const getTypeBadgeColor = (type: string): string => {
    const colors: { [key: string]: string } = {
      signed_term: '#8b5cf6',
      invoice: '#f59e0b',
      manual: '#3b82f6',
      warranty: '#10b981',
      receipt: '#ec4899',
      other: '#6b7280'
    };
    return colors[type] || '#6b7280';
  };

  return (
    <div className="document-uploader-container">
      <div className="document-uploader-header">
        <h3>📄 Documentos Anexados</h3>
        <p className="document-uploader-help">Anexe notas fiscais, termos assinados, manuais, garantias ou outros documentos relacionados</p>
      </div>

      {error && (
        <div className="upload-error">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button className="error-close" onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Upload Form */}
      <div className="upload-form-card">
        <div className="upload-form-header">
          <span className="upload-form-icon">📤</span>
          <span className="upload-form-title">Novo Documento</span>
        </div>

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
              placeholder="Ex: Termo assinado por João Silva"
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
            {uploading ? (
              <>
                <span className="spinner-small"></span>
                Enviando...
              </>
            ) : (
              <>
                <span className="upload-icon">📎</span>
                Selecionar Arquivo
              </>
            )}
          </button>
          <p className="upload-hint">PDF, DOC, XLS ou TXT • Máx. 10MB</p>
        </div>
      </div>

      {/* Documents List */}
      {documents.length > 0 ? (
        <div className="documents-grid">
          {documents.map((doc, index) => (
            <div key={index} className="document-card">
              <div className="document-card-icon">
                {getFileIcon(doc.mimetype)}
              </div>
              <div className="document-card-content">
                <div className="document-card-header">
                  <span 
                    className="document-type-badge"
                    style={{ backgroundColor: getTypeBadgeColor(doc.type) }}
                  >
                    {getTypeLabel(doc.type)}
                  </span>
                </div>
                <div className="document-card-description">{doc.description}</div>
                <div className="document-card-meta">
                  <span>📦 {formatFileSize(doc.size)}</span>
                  <span>📅 {formatDate(doc.uploaded_at)}</span>
                </div>
              </div>
              <div className="document-card-actions">
                <button
                  className="btn-action btn-download-action"
                  onClick={() => handleDownload(doc)}
                  title="Baixar documento"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Baixar
                </button>
                <button
                  className="btn-action btn-delete-action"
                  onClick={() => handleDelete(doc)}
                  title="Excluir documento"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-documents">
          <div className="no-documents-icon">📭</div>
          <p className="no-documents-text">Nenhum documento anexado ainda</p>
          <p className="no-documents-hint">Use o formulário acima para adicionar documentos</p>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Excluir Documento"
        message={`Tem certeza que deseja excluir "${deleteConfirm.doc?.description}"?\n\nEsta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, doc: null })}
        type="danger"
      />
    </div>
  );
};

export default DocumentUploader;
