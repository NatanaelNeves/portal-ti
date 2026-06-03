import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import '../styles/KnowledgeManagementPage.css';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  is_public: boolean;
  created_at: string;
  views_count: number;
  helpful_yes?: number;
  helpful_no?: number;
}

const PRESET_CATEGORIES = [
  'Software', 'Hardware', 'Rede', 'FAQ',
  'Tutoriais', 'Troubleshooting', 'Institucional',
];

const CATEGORY_OTHER = '__outro__';

function insertMarkdown(
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string,
  placeholder: string,
  setter: (val: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end) || placeholder;
  const newValue = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
  setter(newValue);
  setTimeout(() => {
    textarea.focus();
    const newStart = start + prefix.length;
    const newEnd = newStart + selected.length;
    textarea.setSelectionRange(newStart, newEnd);
  }, 0);
}

export default function KnowledgeManagementPage() {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; articleId: string | null }>({ isOpen: false, articleId: null });

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    is_public: true,
  });
  const [categorySelect, setCategorySelect] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    if (!token) { navigate('/admin/login'); return; }
    fetchArticles();
  }, [navigate]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/knowledge');
      setArticles(response.data.articles || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar artigos');
    } finally {
      setLoading(false);
    }
  };

  const openNewForm = () => {
    setEditingArticle(null);
    setFormData({ title: '', content: '', category: '', is_public: true });
    setCategorySelect('');
    setCustomCategory('');
    setError('');
    setShowForm(true);
  };

  const openEditForm = (article: Article) => {
    setEditingArticle(article);
    const isPreset = PRESET_CATEGORIES.includes(article.category);
    setFormData({
      title: article.title,
      content: article.content,
      category: article.category,
      is_public: article.is_public,
    });
    setCategorySelect(isPreset ? article.category : (article.category ? CATEGORY_OTHER : ''));
    setCustomCategory(isPreset ? '' : article.category);
    setError('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingArticle(null);
    setFormData({ title: '', content: '', category: '', is_public: true });
    setCategorySelect('');
    setCustomCategory('');
    setError('');
  };

  const resolvedCategory = categorySelect === CATEGORY_OTHER
    ? customCategory
    : categorySelect;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Título e conteúdo são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...formData, category: resolvedCategory };
      if (editingArticle) {
        await api.put(`/knowledge/${editingArticle.id}`, payload);
      } else {
        await api.post('/knowledge', payload);
      }
      closeForm();
      fetchArticles();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar artigo');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Título e conteúdo são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...formData, category: resolvedCategory, is_public: false };
      if (editingArticle) {
        await api.put(`/knowledge/${editingArticle.id}`, payload);
      } else {
        await api.post('/knowledge', payload);
      }
      closeForm();
      fetchArticles();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar rascunho');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ isOpen: true, articleId: id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.articleId) return;
    try {
      await api.delete(`/knowledge/${deleteConfirm.articleId}`);
      setError('');
      fetchArticles();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao excluir artigo');
    }
  };

  const toolbar = [
    { label: 'B',      title: 'Negrito',   prefix: '**', suffix: '**', placeholder: 'texto' },
    { label: 'I',      title: 'Itálico',   prefix: '_',  suffix: '_',  placeholder: 'texto' },
    { label: '`',      title: 'Código',    prefix: '`',  suffix: '`',  placeholder: 'código' },
    { label: 'H1',     title: 'Título 1',  prefix: '# ', suffix: '',   placeholder: 'título' },
    { label: 'H2',     title: 'Título 2',  prefix: '## ',suffix: '',   placeholder: 'título' },
    { label: 'Link',   title: 'Link',      prefix: '[',  suffix: '](url)', placeholder: 'texto' },
  ];

  if (showForm) {
    return (
      <div className="km-editor-page">
        {/* Editor header */}
        <div className="km-editor-header">
          <button className="km-back-btn" onClick={closeForm}>
            <i className="ti ti-arrow-left" /> Voltar
          </button>
          <span className="km-editor-title">
            {editingArticle ? 'Editar Artigo' : 'Novo Artigo'}
          </span>
        </div>

        {error && (
          <div className="km-alert-error">
            {error}
            <button onClick={() => setError('')}><i className="ti ti-x" /></button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="km-editor-layout">
          {/* Main editor column */}
          <div className="km-editor-main">
            <div className="km-title-wrap">
              <input
                className="km-title-input"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título do artigo..."
                required
              />
            </div>

            <div className="km-divider" />

            <div className="km-content-wrap">
              <label className="km-content-label">Conteúdo (Markdown)</label>

              {/* Toolbar */}
              <div className="km-toolbar">
                {toolbar.map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    title={btn.title}
                    className="km-toolbar-btn"
                    onClick={() => {
                      if (textareaRef.current) {
                        insertMarkdown(
                          textareaRef.current,
                          btn.prefix,
                          btn.suffix,
                          btn.placeholder,
                          (val) => setFormData({ ...formData, content: val })
                        );
                      }
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              <textarea
                ref={textareaRef}
                className="km-content-textarea"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Escreva o conteúdo em Markdown..."
                required
              />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="km-editor-sidebar">
            <div className="km-sidebar-card">
              <h3 className="km-sidebar-title">Configurações</h3>

              {/* Category */}
              <div className="km-sidebar-field">
                <label className="km-sidebar-label">Categoria</label>
                <select
                  className="km-select"
                  value={categorySelect}
                  onChange={(e) => {
                    setCategorySelect(e.target.value);
                    if (e.target.value !== CATEGORY_OTHER) setCustomCategory('');
                  }}
                >
                  <option value="">Sem categoria</option>
                  {PRESET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value={CATEGORY_OTHER}>Outro (digitar)</option>
                </select>
                {categorySelect === CATEGORY_OTHER && (
                  <input
                    className="km-input km-input-mt"
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Nome da categoria..."
                  />
                )}
              </div>

              {/* Public toggle */}
              <div className="km-sidebar-field">
                <div className="km-toggle-row">
                  <div>
                    <span className="km-sidebar-label">Artigo público</span>
                    <p className="km-toggle-desc">Visível para todos os usuários</p>
                  </div>
                  <button
                    type="button"
                    className={`km-toggle ${formData.is_public ? 'km-toggle-on' : ''}`}
                    onClick={() => setFormData({ ...formData, is_public: !formData.is_public })}
                    aria-pressed={formData.is_public}
                  >
                    <span className="km-toggle-thumb" />
                  </button>
                </div>
              </div>

              {/* Status */}
              <div className="km-sidebar-field">
                <label className="km-sidebar-label">Status</label>
                <div className="km-status-pills">
                  <label className={`km-status-pill ${formData.is_public ? 'km-status-active' : ''}`}>
                    <input
                      type="radio"
                      name="km-status"
                      checked={formData.is_public}
                      onChange={() => setFormData({ ...formData, is_public: true })}
                    />
                    <i className="ti ti-circle-check" /> Publicado
                  </label>
                  <label className={`km-status-pill ${!formData.is_public ? 'km-status-active' : ''}`}>
                    <input
                      type="radio"
                      name="km-status"
                      checked={!formData.is_public}
                      onChange={() => setFormData({ ...formData, is_public: false })}
                    />
                    <i className="ti ti-pencil" /> Rascunho
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="km-sidebar-actions">
                <button
                  type="submit"
                  className="km-btn-publish"
                  disabled={saving}
                >
                  <i className="ti ti-send" />
                  {saving ? 'Salvando...' : editingArticle ? 'Salvar Alterações' : 'Publicar Artigo'}
                </button>
                <button
                  type="button"
                  className="km-btn-draft"
                  disabled={saving}
                  onClick={handleSaveDraft}
                >
                  <i className="ti ti-device-floppy" />
                  Salvar rascunho
                </button>
              </div>
            </div>
          </aside>
        </form>
      </div>
    );
  }

  // ── Article list ──
  const filteredArticles = articles.filter((a) => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
    const matchCat = !activeCategory || a.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="km-page">
      <div className="km-list-header">
        <div>
          <div className="km-list-title">
            <i className="ti ti-book" />
            <span>Base de Conhecimento</span>
          </div>
          <p className="km-list-subtitle">Artigos e guias de suporte interno</p>
        </div>
        <button className="km-btn-new" onClick={openNewForm}>
          <i className="ti ti-plus" /> Novo Artigo
        </button>
      </div>

      {error && (
        <div className="km-alert-error">
          {error}
          <button onClick={() => setError('')}><i className="ti ti-x" /></button>
        </div>
      )}

      {/* Search */}
      <div className="km-search-wrap">
        <i className="ti ti-search km-search-icon" />
        <input
          className="km-search-input"
          type="text"
          placeholder="Buscar artigos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Category filter pills */}
      <div className="km-filter-pills">
        <button
          className={`km-filter-pill ${activeCategory === '' ? 'km-filter-pill-active' : ''}`}
          onClick={() => setActiveCategory('')}
        >
          Todos
        </button>
        {PRESET_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`km-filter-pill ${activeCategory === cat ? 'km-filter-pill-active' : ''}`}
            onClick={() => setActiveCategory(activeCategory === cat ? '' : cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="km-loading">
          <div className="km-spinner" />
          <p>Carregando artigos...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="km-empty">
          <i className="ti ti-book-off km-empty-icon" />
          <h3>{articles.length === 0 ? 'Nenhum artigo cadastrado' : 'Nenhum resultado encontrado'}</h3>
          <p>{articles.length === 0 ? 'Crie o primeiro artigo para a base de conhecimento.' : 'Tente outro termo ou categoria.'}</p>
          {articles.length === 0 && (
            <button className="km-btn-new" onClick={openNewForm}>
              <i className="ti ti-plus" /> Novo Artigo
            </button>
          )}
        </div>
      ) : (
        <div className="km-grid">
          {filteredArticles.map((article) => (
            <div key={article.id} className="km-card" onClick={() => openEditForm(article)} style={{ cursor: 'pointer' }}>
              <div className="km-card-top">
                <div className="km-card-badges">
                  <span className={`km-badge-visibility ${article.is_public ? 'km-badge-public' : 'km-badge-private'}`}>
                    <i className={`ti ${article.is_public ? 'ti-world' : 'ti-lock'}`} />
                    {article.is_public ? 'Público' : 'Privado'}
                  </span>
                  {article.category && (
                    <span className="km-badge-category">{article.category}</span>
                  )}
                </div>
              </div>

              <h3 className="km-card-title">{article.title}</h3>

              <p className="km-card-excerpt">
                {article.content.substring(0, 140)}{article.content.length > 140 ? '…' : ''}
              </p>

              <div className="km-card-footer">
                <div className="km-card-meta">
                  <span><i className="ti ti-eye" /> {article.views_count} visualizações</span>
                  {((article.helpful_yes ?? 0) + (article.helpful_no ?? 0)) > 0 && (
                    <span title="Feedbacks útil/não útil">
                      👍 {article.helpful_yes ?? 0} · 👎 {article.helpful_no ?? 0}
                    </span>
                  )}
                  <span>{article.created_at ? new Date(article.created_at).toLocaleDateString('pt-BR') : '-'}</span>
                </div>
                <div className="km-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="km-card-btn"
                    type="button"
                    onClick={() => openEditForm(article)}
                  >
                    <i className="ti ti-pencil" /> Editar
                  </button>
                  <button
                    className="km-card-btn km-card-btn-danger"
                    type="button"
                    onClick={() => handleDelete(article.id)}
                  >
                    <i className="ti ti-trash" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Excluir Artigo"
        message="Deseja realmente excluir este artigo? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, articleId: null })}
      />
    </div>
  );
}
