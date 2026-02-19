import React, { useEffect, useState } from 'react';
import '../styles/FileUpload.css';

interface Attachment {
  id: string;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  url: string;
}

interface AttachmentsListProps {
  ticketId: string;
  onDelete?: (attachmentId: string) => void;
}

const AttachmentsList: React.FC<AttachmentsListProps> = ({ ticketId, onDelete }) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAttachments();
  }, [ticketId]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token') || localStorage.getItem('user_token');
      const headers: HeadersInit = {};

      if (token?.startsWith('Bearer')) {
        headers['Authorization'] = token;
      } else if (token) {
        headers['x-user-token'] = token;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/tickets/${ticketId}/attachments`,
        { headers }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar anexos');
      }

      const data = await response.json();
      setAttachments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📎';
  };

  const handleDownload = (attachment: Attachment) => {
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${attachment.url}`;
    window.open(url, '_blank');
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este anexo?')) return;

    try {
      const token = localStorage.getItem('internal_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/tickets/attachments/${attachmentId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': token || '',
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao excluir anexo');
      }

      setAttachments(attachments.filter(a => a.id !== attachmentId));
      onDelete?.(attachmentId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div>Carregando anexos...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Erro: {error}</div>;
  }

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="attachments-list">
      <h4>Anexos ({attachments.length})</h4>
      {attachments.map((attachment) => (
        <div key={attachment.id} className="attachment-item">
          <div className="attachment-icon">
            {getFileIcon(attachment.mime_type)}
          </div>
          <div className="attachment-info">
            <div className="attachment-name">{attachment.original_name}</div>
            <div className="attachment-meta">
              {formatFileSize(attachment.file_size)} • {new Date(attachment.created_at).toLocaleDateString('pt-BR')}
            </div>
          </div>
          <div className="attachment-actions">
            <button
              className="attachment-btn attachment-btn-download"
              onClick={() => handleDownload(attachment)}
            >
              📥 Baixar
            </button>
            {localStorage.getItem('internal_token') && (
              <button
                className="attachment-btn attachment-btn-delete"
                onClick={() => handleDelete(attachment.id)}
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AttachmentsList;
