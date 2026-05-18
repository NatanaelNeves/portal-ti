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

const DOC_TYPES: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  manual:    { label: 'Manual',        icon: 'ti-book',        color: '#1D4ED8', bg: '#DBEAFE' },
  policy:    { label: 'Política',      icon: 'ti-certificate', color: '#6D28D9', bg: '#EDE9FE' },
  procedure: { label: 'Procedimento',  icon: 'ti-list-check',  color: '#065F46', bg: '#D1FAE5' },
  form:      { label: 'Formulário',    icon: 'ti-forms',       color: '#92400E', bg: '#FEF3C7' },
  template:  { label: 'Modelo',        icon: 'ti-template',    color: '#3730A3', bg: '#E0E7FF' },
  other:     { label: 'Outro',         icon: 'ti-file',        color: '#374151', bg: '#F3F4F6' },
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterType, setFilterType] = useState('');
  const [filterPublic, setFilterPublic] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
        await api.put(`/documents/${editingDoc.id}`, formData);
      } else {
        const fd = new FormData();
        fd.append('title', formData.title);
        fd.append('description', formData.description);
        fd.append('document_type', formData.document_type);
        fd.append('is_public', String(formData.is_public));
        if (selectedFile) fd.append('file', selectedFile);
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
    } catch {
      setError('Erro ao remover documento');
    }
  };

  const handleDownload = async (doc: Document) => {
    if (!doc.file_url) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/documents/${doc.id}/download`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Falha ao baixar documento`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ext = doc.file_url.split('.').pop() || 'pdf';
      link.download = `${doc.title}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(`Erro ao baixar documento: ${error.message}\n\nTente novamente ou contate o suporte de TI.`);
    }
  };

  return (
    <div className="dp-page">
      {/* Header */}
      <div className="dp-header">
        <div className="dp-header-left">
          <div className="dp-title">
            <i className="ti ti-folder" />
            <span>Gestão de Documentos</span>
          </div>
          <p className="dp-subtitle">Manuais, políticas, procedimentos e formulários</p>
        </div>
        <button className="dp-btn-new" onClick={() => handleOpenForm()}>
          <i className="ti ti-plus" />
          Novo Documento
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="dp-stats">
          <div className="dp-stat-card">
            <i className="ti ti-folder dp-stat-icon" />
            <span className="dp-stat-number">{stats.total}</span>
            <span className="dp-stat-label">Total</span>
          </div>
          <div className="dp-stat-card">
            <i className="ti ti-book dp-stat-icon" />
            <span className="dp-stat-number">{stats.manuais}</span>
            <span className="dp-stat-label">Manuais</span>
          </div>
          <div className="dp-stat-card">
            <i className="ti ti-certificate dp-stat-icon" />
            <span className="dp-stat-number">{stats.politicas}</span>
            <span className="dp-stat-label">Políticas</span>
          </div>
          <div className="dp-stat-card">
            <i className="ti ti-list-check dp-stat-icon" />
            <span className="dp-stat-number">{stats.procedimentos}</span>
            <span className="dp-stat-label">Procedimentos</span>
          </div>
          <div className="dp-stat-card">
            <i className="ti ti-eye dp-stat-icon" />
            <span className="dp-stat-number">{stats.total_views}</span>
            <span className="dp-stat-label">Visualizações</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="dp-filters">
        <div className="dp-search-wrap">
          <i className="ti ti-search dp-search-icon" />
          <input
            className="dp-search-input"
            type="text"
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select className="dp-filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Todos os tipos</option>
          {Object.entries(DOC_TYPES).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <select className="dp-filter-select" value={filterPublic} onChange={(e) => setFilterPublic(e.target.value)}>
          <option value="">Visibilidade</option>
          <option value="true">Público</option>
          <option value="false">Privado</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="dp-error">
          <span>{error}</span>
          <button onClick={() => setError('')}><i className="ti ti-x" /></button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="dp-modal-overlay" onClick={handleCloseForm}>
          <div className="dp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dp-modal-header">
              <h2>{editingDoc ? 'Editar Documento' : 'Novo Documento'}</h2>
              <button className="dp-modal-close" onClick={handleCloseForm}>
                <i className="ti ti-x" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="dp-form">
              <div className="dp-form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Nome do documento"
                />
              </div>

              <div className="dp-form-group">
                <label>Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição breve do documento..."
                  rows={3}
                />
              </div>

              <div className="dp-form-row">
                <div className="dp-form-group">
                  <label>Tipo *</label>
                  <select
                    value={formData.document_type}
                    onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  >
                    {Object.entries(DOC_TYPES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                <div className="dp-form-group dp-form-checkbox-group">
                  <label className="dp-checkbox-label">
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
                <div className="dp-form-group">
                  <label>Arquivo</label>
                  <div className="dp-file-upload">
                    <input
                      type="file"
                      id="dp-file-input"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                    />
                    <label htmlFor="dp-file-input" className="dp-file-label">
                      <i className="ti ti-upload" />
                      {selectedFile ? (
                        <span>{selectedFile.name} ({formatFileSize(selectedFile.size)})</span>
                      ) : (
                        <span>Clique para selecionar um arquivo<br /><small>PDF, DOC, XLS, TXT, imagens (máx. 10MB)</small></span>
                      )}
                    </label>
                  </div>
                </div>
              )}

              <div className="dp-form-actions">
                <button type="button" className="dp-btn-cancel" onClick={handleCloseForm}>
                  Cancelar
                </button>
                <button type="submit" className="dp-btn-submit" disabled={saving}>
                  {saving ? 'Salvando...' : editingDoc ? 'Salvar Alterações' : 'Cadastrar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="dp-loading">
          <div className="dp-spinner" />
          <p>Carregando documentos...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="dp-empty">
          <i className="ti ti-folder-open dp-empty-icon" />
          <h3>Nenhum documento cadastrado</h3>
          <p>Clique em "Novo Documento" para adicionar manuais, políticas e procedimentos.</p>
          <button className="dp-btn-new" onClick={() => handleOpenForm()}>
            <i className="ti ti-plus" /> Novo Documento
          </button>
        </div>
      ) : (
        <div className="dp-grid">
          {documents.map((doc) => {
            const typeInfo = DOC_TYPES[doc.document_type] || DOC_TYPES.other;
            const metaParts: string[] = [];
            if (doc.file_size) metaParts.push(formatFileSize(doc.file_size));
            metaParts.push(formatDate(doc.created_at));

            return (
              <div key={doc.id} className="dp-card">
                <div className="dp-card-top">
                  <span
                    className="dp-type-badge"
                    style={{ color: typeInfo.color, background: typeInfo.bg }}
                  >
                    <i className={`ti ${typeInfo.icon}`} />
                    {typeInfo.label}
                  </span>
                  <span className="dp-visibility" title={doc.is_public ? 'Público' : 'Privado'}>
                    <i className={`ti ${doc.is_public ? 'ti-world' : 'ti-lock'}`} />
                  </span>
                </div>

                <h3 className="dp-card-title">{doc.title}</h3>

                {doc.description && (
                  <p className="dp-card-desc">{doc.description}</p>
                )}

                <div className="dp-card-meta">
                  <span><i className="ti ti-eye" /> {doc.views_count}</span>
                  {metaParts.map((p, i) => <span key={i}>{p}</span>)}
                  {doc.uploaded_by_name && <span>Por: {doc.uploaded_by_name}</span>}
                </div>

                <div className="dp-card-actions">
                  {doc.file_url && (
                    <button
                      className="dp-action-btn dp-action-download"
                      onClick={() => handleDownload(doc)}
                      title="Baixar documento"
                    >
                      <i className="ti ti-download" /> Baixar
                    </button>
                  )}
                  <button
                    className="dp-action-btn dp-action-edit"
                    onClick={() => handleOpenForm(doc)}
                    title="Editar"
                  >
                    <i className="ti ti-pencil" /> Editar
                  </button>
                  <button
                    className="dp-action-icon dp-action-delete"
                    onClick={() => setDeleteConfirm({ isOpen: true, docId: doc.id })}
                    title="Excluir"
                  >
                    <i className="ti ti-trash" />
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
