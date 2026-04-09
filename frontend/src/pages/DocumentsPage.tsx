import { useState, useEffect, useCallback } from 'react';
import api, { BACKEND_URL } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import '../styles/DocumentsPage.css';

interface Document {
  id: string;
  title: string;
  description: string | null;
  document_type: string;
  file_url: string | null;
  file_size: number | null;
  is_public: boolean;
  uploaded_by_id: string;
  uploaded_by_name: string | null;
  views_count: number;
  created_at: string;
  updated_at: string;
}

interface DocumentStats {
  total: string;
  manuais: string;
  politicas: string;
  procedimentos: string;
  formularios: string;
  modelos: string;
  outros: string;
  publicos: string;
  privados: string;
  total_views: string;
}

const DOC_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  manual: { label: 'Manual', icon: '📘', color: '#3b82f6' },
  policy: { label: 'Política', icon: '📜', color: '#8b5cf6' },
  procedure: { label: 'Procedimento', icon: '📋', color: '#10b981' },
  form: { label: 'Formulário', icon: '📝', color: '#f59e0b' },
  template: { label: 'Modelo', icon: '📄', color: '#6366f1' },
  other: { label: 'Outro', icon: '📎', color: '#6b7280' },
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterPublic, setFilterPublic] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    document_type: 'manual',
    is_public: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; docId: string | null }>({
    isOpen: false,
    docId: null,
  });

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterType) params.document_type = filterType;
      if (filterPublic) params.is_public = filterPublic;
      if (searchTerm) params.search = searchTerm;

      const [docsRes, statsRes] = await Promise.all([
        api.get('/documents', { params }),
        api.get('/documents/stats'),
      ]);

      setDocuments(docsRes.data);
      setStats(statsRes.data);
      setError('');
    } catch (err: any) {
      setError('Erro ao carregar documentos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterPublic, searchTerm]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleOpenForm = (doc?: Document) => {
    if (doc) {
      setEditingDoc(doc);
      setFormData({
        title: doc.title,
        description: doc.description || '',
        document_type: doc.document_type,
        is_public: doc.is_public,
      });
    } else {
      setEditingDoc(null);
      setFormData({ title: '', description: '', document_type: 'manual', is_public: false });
    }
    setSelectedFile(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingDoc(null);
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingDoc) {
        // Update metadata only
        await api.put(`/documents/${editingDoc.id}`, formData);
      } else {
        // Create with optional file
        const fd = new FormData();
        fd.append('title', formData.title);
        fd.append('description', formData.description);
        fd.append('document_type', formData.document_type);
        fd.append('is_public', String(formData.is_public));
        if (selectedFile) {
          fd.append('file', selectedFile);
        }
        await api.post('/documents', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      handleCloseForm();
      fetchDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar documento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.docId) return;
    try {
      await api.delete(`/documents/${deleteConfirm.docId}`);
      setDeleteConfirm({ isOpen: false, docId: null });
      fetchDocuments();
    } catch (err) {
      setError('Erro ao remover documento');
    }
  };

  const handleDownload = async (doc: Document) => {
    if (!doc.file_url) return;

    try {
      console.log('📥 Downloading document:', doc.id, doc.title);
      
      // Usar o endpoint de download da API para melhor confiabilidade
      const response = await fetch(`${BACKEND_URL}/api/documents/${doc.id}/download`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Download failed:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Falha ao baixar documento`);
      }

      // Obter blob e criar link de download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Extrair nome do arquivo da URL ou usar título
      const ext = doc.file_url.split('.').pop() || 'pdf';
      link.download = `${doc.title}.${ext}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Download successful');
    } catch (error: any) {
      console.error('❌ Erro ao baixar documento:', error.message);
      alert(`Erro ao baixar documento: ${error.message}\n\nTente novamente ou contate o suporte de TI.`);
    }
  };

  return (
    <div className="documents-page">
      {/* Header */}
      <div className="docs-header">
        <div>
          <h1>📁 Gestão de Documentos</h1>
          <p className="docs-subtitle">
            Manuais, políticas, procedimentos e formulários da organização
          </p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenForm()}>
          + Novo Documento
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="docs-stats">
          <div className="stat-card">
            <span className="stat-icon">📁</span>
            <div>
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📘</span>
            <div>
              <span className="stat-number">{stats.manuais}</span>
              <span className="stat-label">Manuais</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📜</span>
            <div>
              <span className="stat-number">{stats.politicas}</span>
              <span className="stat-label">Políticas</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📋</span>
            <div>
              <span className="stat-number">{stats.procedimentos}</span>
              <span className="stat-label">Procedimentos</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">👁️</span>
            <div>
              <span className="stat-number">{stats.total_views}</span>
              <span className="stat-label">Visualizações</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="docs-filters">
        <input
          type="text"
          placeholder="🔍 Buscar documentos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
          <option value="">Todos os tipos</option>
          {Object.entries(DOC_TYPES).map(([key, val]) => (
            <option key={key} value={key}>
              {val.icon} {val.label}
            </option>
          ))}
        </select>
        <select value={filterPublic} onChange={(e) => setFilterPublic(e.target.value)} className="filter-select">
          <option value="">Visibilidade</option>
          <option value="true">Público</option>
          <option value="false">Privado</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="docs-error">
          ⚠️ {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="docs-modal-overlay" onClick={handleCloseForm}>
          <div className="docs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="docs-modal-header">
              <h2>{editingDoc ? 'Editar Documento' : 'Novo Documento'}</h2>
              <button className="modal-close" onClick={handleCloseForm}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="docs-form">
              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Nome do documento"
                />
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição breve do documento..."
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tipo *</label>
                  <select
                    value={formData.document_type}
                    onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  >
                    {Object.entries(DOC_TYPES).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.icon} {val.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_public}
                      onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    />
                    Documento público (visível para todos)
                  </label>
                </div>
              </div>

              {!editingDoc && (
                <div className="form-group">
                  <label>Arquivo</label>
                  <div className="file-upload-area">
                    <input
                      type="file"
                      id="doc-file-input"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                    />
                    <label htmlFor="doc-file-input" className="file-upload-label">
                      {selectedFile ? (
                        <span>📎 {selectedFile.name} ({formatFileSize(selectedFile.size)})</span>
                      ) : (
                        <span>📂 Clique para selecionar um arquivo<br /><small>PDF, DOC, XLS, TXT, imagens (máx. 10MB)</small></span>
                      )}
                    </label>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseForm}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : editingDoc ? 'Salvar Alterações' : 'Cadastrar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="docs-loading">
          <div className="spinner"></div>
          <p>Carregando documentos...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="docs-empty">
          <div className="empty-icon">📁</div>
          <h3>Nenhum documento cadastrado</h3>
          <p>Clique em "Novo Documento" para adicionar manuais, políticas e procedimentos.</p>
          <button className="btn-primary" onClick={() => handleOpenForm()}>
            + Novo Documento
          </button>
        </div>
      ) : (
        <div className="docs-grid">
          {documents.map((doc) => {
            const typeInfo = DOC_TYPES[doc.document_type] || DOC_TYPES.other;
            return (
              <div key={doc.id} className="doc-card">
                <div className="doc-card-header">
                  <span className="doc-type-badge" style={{ backgroundColor: typeInfo.color }}>
                    {typeInfo.icon} {typeInfo.label}
                  </span>
                  <div className="doc-visibility">
                    {doc.is_public ? (
                      <span className="badge-public" title="Público">🌐</span>
                    ) : (
                      <span className="badge-private" title="Privado">🔒</span>
                    )}
                  </div>
                </div>

                <h3 className="doc-title">{doc.title}</h3>
                {doc.description && (
                  <p className="doc-description">{doc.description}</p>
                )}

                <div className="doc-meta">
                  <span title="Visualizações">👁️ {doc.views_count}</span>
                  {doc.file_size && <span title="Tamanho">💾 {formatFileSize(doc.file_size)}</span>}
                  <span title="Data">{formatDate(doc.created_at)}</span>
                </div>

                {doc.uploaded_by_name && (
                  <div className="doc-author">
                    Por: {doc.uploaded_by_name}
                  </div>
                )}

                <div className="doc-actions">
                  {doc.file_url && (
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
                  )}
                  <button
                    className="btn-icon btn-edit"
                    onClick={() => handleOpenForm(doc)}
                    title="Editar"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    className="btn-icon btn-delete"
                    onClick={() => setDeleteConfirm({ isOpen: true, docId: doc.id })}
                    title="Excluir"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Excluir Documento"
        message="Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, docId: null })}
      />
    </div>
  );
}
