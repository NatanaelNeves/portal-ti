import { useState, useEffect, useRef } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { BACKEND_URL } from '../services/api';
import '../styles/TicketAttachments.css';

interface Attachment {
  id: string;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by_type: string;
  created_at: string;
  url: string;
}

interface Props {
  ticketId: string;
  userToken?: string;
  authToken?: string;
  department?: string;
}

export default function TicketAttachments({ ticketId, userToken, authToken, department }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; attachmentId: string | null }>({
    isOpen: false,
    attachmentId: null,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAttachments();
  }, [ticketId]);

  const getHeaders = () => {
    const headers: HeadersInit = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    else if (userToken) headers['x-user-token'] = userToken;
    return headers;
  };

  const fetchAttachments = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tickets/${ticketId}/attachments`, {
        headers: getHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setAttachments(data);
      }
    } catch (err) {
      console.error('Error fetching attachments:', err);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = '';
  };

  const uploadFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo: 10MB');
      return;
    }

    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de arquivo não permitido. Use: imagens (JPG, PNG, GIF), PDF, DOC, XLS, TXT');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('attachment', file);

      const response = await fetch(`${BACKEND_URL}/api/tickets/${ticketId}/attachments`, {
        method: 'POST',
        headers: getHeaders(),
        body: formData,
      });

      if (!response.ok) throw new Error('Erro ao enviar arquivo');

      setSuccess('Arquivo enviado com sucesso!');
      fetchAttachments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  const handleDelete = (attachmentId: string) => {
    setDeleteConfirm({ isOpen: true, attachmentId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.attachmentId) return;

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/tickets/${ticketId}/attachments/${deleteConfirm.attachmentId}`,
        { method: 'DELETE', headers: getHeaders() }
      );
      if (!response.ok) throw new Error('Erro ao deletar anexo');
      setSuccess('Anexo deletado com sucesso!');
      fetchAttachments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar anexo');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    );
    if (mimeType === 'application/pdf') return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
    );
    if (mimeType.includes('word')) return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>
      </svg>
    );
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <rect x="8" y="13" width="8" height="6" rx="1"/>
      </svg>
    );
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    );
  };

  const formatDate = (dateString: string): string =>
    new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const handleDownload = async (attachment: Attachment) => {
    try {
      const fullUrl = attachment.url.startsWith('http')
        ? attachment.url
        : `${BACKEND_URL}${attachment.url}`;
      const response = await fetch(fullUrl, { headers: getHeaders() });
      if (!response.ok) throw new Error('Erro ao baixar arquivo');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.original_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao baixar arquivo:', err);
      setError('Erro ao baixar arquivo');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="ticket-attachments">
      {/* Header */}
      <div className="attachments-header">
        <h3 className="attachments-title">
          Anexos
          {attachments.length > 0 && (
            <span className="attachments-count">{attachments.length}</span>
          )}
        </h3>
      </div>

      {/* Status messages */}
      {error && <div className="attach-alert attach-alert-error">{error}</div>}
      {success && <div className="attach-alert attach-alert-success">{success}</div>}

      {/* Drop zone */}
      <div
        className={`drop-zone ${isDragOver ? 'drop-zone-active' : ''} ${uploading ? 'drop-zone-uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Clique ou arraste um arquivo para enviar"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
          style={{ display: 'none' }}
          aria-hidden="true"
        />
        <div className="drop-zone-icon" aria-hidden="true">
          {uploading ? (
            <div className="drop-spinner" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          )}
        </div>
        <div className="drop-zone-text">
          {uploading
            ? 'Enviando arquivo...'
            : isDragOver
            ? 'Solte para enviar'
            : 'Arraste um arquivo ou clique para selecionar'}
        </div>
        <div className="drop-zone-hint">JPG, PNG, PDF, DOC, XLS, TXT — máx. 10MB</div>
      </div>

      {/* File list */}
      {attachments.length > 0 && (
        <div className="attachments-list">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="attachment-card">
              <div className="attachment-file-icon">
                {getFileIcon(attachment.mime_type)}
              </div>
              <div className="attachment-info">
                <div className="attachment-name" title={attachment.original_name}>
                  {attachment.original_name}
                </div>
                <div className="attachment-meta">
                  <span>{formatFileSize(attachment.file_size)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatDate(attachment.created_at)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{attachment.uploaded_by_type === 'it_staff'
                    ? (department === 'rh' ? 'Equipe RH' : department === 'administrativo' ? 'Equipe Administrativa' : 'Equipe TI')
                    : 'Usuário'}</span>
                </div>
              </div>
              <div className="attachment-actions">
                <button
                  onClick={() => handleDownload(attachment)}
                  className="btn-attach btn-download"
                  title="Baixar arquivo"
                  aria-label={`Baixar ${attachment.original_name}`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(attachment.id)}
                  className="btn-attach btn-delete"
                  title="Deletar anexo"
                  aria-label={`Deletar ${attachment.original_name}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Deletar Anexo"
        message="Tem certeza que deseja deletar este anexo? Esta ação não pode ser desfeita."
        confirmText="Deletar"
        cancelText="Cancelar"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, attachmentId: null })}
      />
    </div>
  );
}
