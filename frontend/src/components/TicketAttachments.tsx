import { useState, useEffect } from 'react';
import ConfirmDialog from './ConfirmDialog';
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
  userToken?: string; // Para usuário público
  authToken?: string; // Para usuário interno (TI)
}

export default function TicketAttachments({ ticketId, userToken, authToken }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; attachmentId: string | null }>({ isOpen: false, attachmentId: null });

  useEffect(() => {
    fetchAttachments();
  }, [ticketId]);

  const getHeaders = () => {
    const headers: HeadersInit = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    } else if (userToken) {
      headers['x-user-token'] = userToken;
    }
    return headers;
  };

  const fetchAttachments = async () => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/attachments`, {
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

    // Validar tamanho (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo: 10MB');
      return;
    }

    // Validar tipo
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
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

      const response = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: 'POST',
        headers: getHeaders(),
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar arquivo');
      }

      setSuccess('Arquivo enviado com sucesso!');
      fetchAttachments();
      
      // Limpar input
      e.target.value = '';
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    setDeleteConfirm({ isOpen: true, attachmentId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.attachmentId) return;

    try {
      const response = await fetch(`/api/tickets/${ticketId}/attachments/${deleteConfirm.attachmentId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar anexo');
      }

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

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    return '📎';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      // Fazer fetch do arquivo com autenticação
      const response = await fetch(attachment.url, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erro ao baixar arquivo');
      }

      // Converter para blob
      const blob = await response.blob();
      
      // Criar URL temporária do blob
      const url = window.URL.createObjectURL(blob);
      
      // Criar link e forçar download
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.original_name;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
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
      <div className="attachments-header">
        <h3>📎 Anexos ({attachments.length})</h3>
        <label className="btn-upload">
          <input
            type="file"
            onChange={handleFileSelect}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          {uploading ? '⏳ Enviando...' : '📤 Anexar Arquivo'}
        </label>
      </div>

      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          ✅ {success}
        </div>
      )}

      <div className="attachments-info">
        <small>
          📌 Tipos permitidos: Imagens (JPG, PNG, GIF), PDF, DOC, XLS, TXT<br />
          💾 Tamanho máximo: 10MB por arquivo
        </small>
      </div>

      {attachments.length === 0 ? (
        <div className="attachments-empty">
          <span className="empty-icon">📎</span>
          <p>Nenhum anexo ainda</p>
          <small>Envie screenshots, logs ou documentos relacionados</small>
        </div>
      ) : (
        <div className="attachments-list">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="attachment-card">
              <div className="attachment-icon">
                {getFileIcon(attachment.mime_type)}
              </div>
              <div className="attachment-info">
                <div className="attachment-name">{attachment.original_name}</div>
                <div className="attachment-meta">
                  <span>{formatFileSize(attachment.file_size)}</span>
                  <span>•</span>
                  <span>{formatDate(attachment.created_at)}</span>
                  <span>•</span>
                  <span>{attachment.uploaded_by_type === 'it_staff' ? '👤 TI' : '👥 Usuário'}</span>
                </div>
              </div>
              <div className="attachment-actions">
                <button
                  onClick={() => handleDownload(attachment)}
                  className="btn-download"
                  title="Baixar arquivo"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '4px 8px'
                  }}
                >
                  ⬇️
                </button>
                <button
                  onClick={() => handleDelete(attachment.id)}
                  className="btn-delete"
                  title="Deletar anexo"
                >
                  🗑️
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
