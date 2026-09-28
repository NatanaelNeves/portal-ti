import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import MiniMarkdown, { stripMarkdown } from '../components/MiniMarkdown';
import { showToast } from '../utils/toast';
import { ARTICLE_CATEGORIES, articleCategoryMeta, normalizeArticleCategory } from '../utils/articleCategories';
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

type StatusFilter = 'all' | 'public' | 'draft';

const CATEGORY_OTHER = '__outro__';

const TOOLBAR = [
  { icon: 'ti-bold', title: 'Negrito', prefix: '**', suffix: '**', placeholder: 'texto' },
  { icon: 'ti-italic', title: 'Itálico', prefix: '_', suffix: '_', placeholder: 'texto' },
  { icon: 'ti-h-2', title: 'Título', prefix: '## ', suffix: '', placeholder: 'Título', line: true },
  { icon: 'ti-h-3', title: 'Subtítulo', prefix: '### ', suffix: '', placeholder: 'Subtítulo', line: true },
  { icon: 'ti-list', title: 'Lista', prefix: '- ', suffix: '', placeholder: 'item', line: true },
  { icon: 'ti-list-numbers', title: 'Passo a passo', prefix: '1. ', suffix: '', placeholder: 'passo', line: true },
  { icon: 'ti-code', title: 'Código ou atalho', prefix: '`', suffix: '`', placeholder: 'Ctrl+P' },
  { icon: 'ti-link', title: 'Link', prefix: '[', suffix: '](https://)', placeholder: 'texto do link' },
];

function insertMarkdown(
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string,
  placeholder: string,
  line: boolean,
  setter: (val: string) => void,
) {
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  // Marcações de linha começam no início da linha.
  const needsBreak = line && start > 0 && value[start - 1] !== '\n';
  const selected = value.slice(start, end) || placeholder;
  const before = value.slice(0, start) + (needsBreak ? '\n' : '');
  const next = before + prefix + selected + suffix + value.slice(end);
  setter(next);
  window.setTimeout(() => {
    textarea.focus();
    const s = before.length + prefix.length;
    textarea.setSelectionRange(s, s + selected.length);
  }, 0);
}

const dateLabel = (iso: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

export default function KnowledgeManagementPage() {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', is_public: true });
  const [categorySelect, setCategorySelect] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    if (!localStorage.getItem('internal_token')) { navigate('/admin/login'); return; }
    void fetchArticles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/knowledge');
      setArticles(response.data.articles || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Não foi possível carregar os artigos.');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (article?: Article) => {
    setEditingArticle(article ?? null);
    setMode('write');
    setError('');
    if (article) {
      const id = normalizeArticleCategory(article.category);
      const known = ARTICLE_CATEGORIES.some((c) => c.id === id);
      setFormData({ title: article.title, content: article.content, is_public: article.is_public });
      setCategorySelect(known ? id : article.category ? CATEGORY_OTHER : '');
      setCustomCategory(known ? '' : article.category || '');
    } else {
      setFormData({ title: '', content: '', is_public: true });
      setCategorySelect('');
      setCustomCategory('');
    }
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingArticle(null);
    setError('');
  };

  const resolvedCategory = categorySelect === CATEGORY_OTHER ? customCategory.trim() : categorySelect;

  const save = async (asDraft: boolean) => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Escreva um título e o conteúdo antes de salvar.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...formData, is_public: asDraft ? false : formData.is_public, category: resolvedCategory };
      if (editingArticle) await api.put(`/knowledge/${editingArticle.id}`, payload);
      else await api.post('/knowledge', payload);
      showToast.success(asDraft || !payload.is_public ? 'Rascunho salvo.' : editingArticle ? 'Artigo atualizado.' : 'Artigo publicado na Central de dúvidas.');
      closeForm();
      void fetchArticles();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Não foi possível salvar o artigo.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    try {
      await api.delete(`/knowledge/${id}`);
      showToast.success('Artigo excluído.');
      if (editingArticle?.id === id) closeForm();
      void fetchArticles();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Não foi possível excluir o artigo.');
    }
  };

  // ── Números e filtros ──
  const published = articles.filter((a) => a.is_public).length;
  const drafts = articles.length - published;
  const views = articles.reduce((sum, a) => sum + (Number(a.views_count) || 0), 0);
  const yes = articles.reduce((sum, a) => sum + (Number(a.helpful_yes) || 0), 0);
  const no = articles.reduce((sum, a) => sum + (Number(a.helpful_no) || 0), 0);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    articles.forEach((a) => {
      const id = normalizeArticleCategory(a.category);
      if (id) map.set(id, (map.get(id) || 0) + 1);
    });
    return map;
  }, [articles]);

  const categoryChips = [
    ...ARTICLE_CATEGORIES.map((c) => c.id),
    ...Array.from(categoryCounts.keys()).filter((id) => !ARTICLE_CATEGORIES.some((c) => c.id === id)),
  ];

  const filtered = articles.filter((a) => {
    const q = searchTerm.trim().toLowerCase();
    const matchSearch = !q || a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
    const matchCat = !activeCategory || normalizeArticleCategory(a.category) === activeCategory;
    const matchStatus = statusFilter === 'all' || (statusFilter === 'public' ? a.is_public : !a.is_public);
    return matchSearch && matchCat && matchStatus;
  });

  // ── Editor ──
  if (showForm) {
    const cat = articleCategoryMeta(resolvedCategory);
    return (
      <div className="tpg km">
        <header className="km-editbar">
          <button type="button" className="tpg-btn" onClick={closeForm}>
            <i className="ti ti-arrow-left" aria-hidden="true" />Artigos
          </button>
          <h1>{editingArticle ? 'Editar artigo' : 'Novo artigo'}</h1>
          <span className={`tpg-badge tpg-badge--dot ${formData.is_public ? 'tpg-badge--ok' : 'tpg-badge--muted'}`}>
            {formData.is_public ? 'Será publicado' : 'Rascunho'}
          </span>
        </header>

        {error && (
          <div className="tpg-alert" role="alert">
            <i className="ti ti-alert-circle" aria-hidden="true" /><span>{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Fechar aviso"><i className="ti ti-x" aria-hidden="true" /></button>
          </div>
        )}

        <form className="km-editor" onSubmit={(e) => { e.preventDefault(); void save(false); }}>
          <section className="tpg-card km-editor__main">
            <label className="pub-sr-only" htmlFor="km-title">Título do artigo</label>
            <input
              id="km-title"
              className="km-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Título do artigo"
              required
            />

            <div className="km-editor__bar">
              <div className="tpg-seg" role="group" aria-label="Modo do editor">
                <button type="button" aria-pressed={mode === 'write'} onClick={() => setMode('write')}>Escrever</button>
                <button type="button" aria-pressed={mode === 'preview'} onClick={() => setMode('preview')}>Visualizar</button>
              </div>
              {mode === 'write' && (
                <div className="km-toolbar" role="toolbar" aria-label="Formatação">
                  {TOOLBAR.map((b) => (
                    <button
                      key={b.icon}
                      type="button"
                      className="tpg-icon-btn"
                      title={b.title}
                      aria-label={b.title}
                      onClick={() => textareaRef.current && insertMarkdown(
                        textareaRef.current, b.prefix, b.suffix, b.placeholder, !!b.line,
                        (val) => setFormData((f) => ({ ...f, content: val })),
                      )}
                    >
                      <i className={`ti ${b.icon}`} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {mode === 'write' ? (
              <>
                <label className="pub-sr-only" htmlFor="km-content">Conteúdo</label>
                <textarea
                  id="km-content"
                  ref={textareaRef}
                  className="km-content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder={'Explique o passo a passo.\n\nUse a barra acima para títulos, listas e links.'}
                  required
                />
              </>
            ) : (
              <div className="km-preview">
                <h2>{formData.title || 'Sem título'}</h2>
                {formData.content.trim()
                  ? <MiniMarkdown className="pub-md" source={formData.content} />
                  : <p className="tpg-muted">Nada escrito ainda.</p>}
              </div>
            )}
          </section>

          <aside className="km-editor__side">
            <section className="tpg-card km-side">
              <h2>Publicação</h2>
              <label className="tpg-field">
                <span>Categoria</span>
                <select
                  value={categorySelect}
                  onChange={(e) => { setCategorySelect(e.target.value); if (e.target.value !== CATEGORY_OTHER) setCustomCategory(''); }}
                >
                  <option value="">Sem categoria</option>
                  {ARTICLE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  <option value={CATEGORY_OTHER}>Outra (digitar)</option>
                </select>
              </label>
              {categorySelect === CATEGORY_OTHER && (
                <label className="tpg-field">
                  <span>Nome da categoria</span>
                  <input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Ex.: Impressoras" />
                </label>
              )}
              {resolvedCategory && (
                <p className="km-side__cat">
                  <span className={`pub-gicon ${cat.tone ? `pub-gicon--${cat.tone}` : ''}`} aria-hidden="true"><i className={`ti ${cat.icon}`} /></span>
                  Aparece em "{cat.label}" na central.
                </p>
              )}

              <label className="tpg-switch">
                <span>
                  <strong>Publicado na central</strong>
                  <small>Qualquer pessoa pode ler em /central</small>
                </span>
                <input type="checkbox" checked={formData.is_public} onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })} />
                <i aria-hidden="true" />
              </label>

              <div className="km-side__actions">
                <button type="submit" className="tpg-btn tpg-btn--primary" disabled={saving}>
                  <i className="ti ti-send" aria-hidden="true" />
                  {saving ? 'Salvando…' : !formData.is_public ? 'Salvar' : editingArticle ? 'Salvar alterações' : 'Publicar artigo'}
                </button>
                {formData.is_public && (
                  <button type="button" className="tpg-btn" disabled={saving} onClick={() => void save(true)}>
                    <i className="ti ti-device-floppy" aria-hidden="true" />Salvar como rascunho
                  </button>
                )}
                {editingArticle && (
                  <button type="button" className="tpg-btn km-side__delete" onClick={() => setDeleteId(editingArticle.id)}>
                    <i className="ti ti-trash" aria-hidden="true" />Excluir artigo
                  </button>
                )}
              </div>
            </section>

            <section className="tpg-card km-side km-help">
              <h2>Dicas</h2>
              <ul>
                <li>Título com a dúvida como a pessoa falaria: "Como trocar o toner".</li>
                <li>Use passo a passo numerado para procedimentos.</li>
                <li>Confira em "Visualizar" antes de publicar.</li>
              </ul>
            </section>
          </aside>
        </form>

        <ConfirmDialog
          isOpen={deleteId !== null}
          title="Excluir artigo?"
          message="O artigo sai da Central de dúvidas e não pode ser recuperado."
          confirmText="Excluir"
          cancelText="Cancelar"
          type="danger"
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteId(null)}
        />
      </div>
    );
  }

  // ── Lista ──
  return (
    <div className="tpg km">
      <header className="tpg-hero pub-aurora">
        <div className="tpg-hero__top">
          <div className="tpg-hero__title">
            <span className="pub-gicon" aria-hidden="true"><i className="ti ti-help-circle" /></span>
            <div>
              <h1>Central de dúvidas</h1>
              <p>Artigos que qualquer pessoa lê na central pública. Rascunhos ficam só para a equipe.</p>
            </div>
          </div>
          <div className="tpg-hero__actions">
            <a className="tpg-btn tpg-btn--glass" href="/central" target="_blank" rel="noopener noreferrer">
              <i className="ti ti-external-link" aria-hidden="true" />Ver central pública
            </a>
            <button type="button" className="tpg-btn tpg-btn--sun" onClick={() => openForm()}>
              <i className="ti ti-plus" aria-hidden="true" />Novo artigo
            </button>
          </div>
        </div>

        <ul className="tpg-stats" aria-label="Resumo">
          <li className="tpg-stat"><strong>{published}</strong>publicados</li>
          <li className="tpg-stat"><strong>{drafts}</strong>{drafts === 1 ? 'rascunho' : 'rascunhos'}</li>
          <li className="tpg-stat"><strong>{views}</strong>leituras</li>
          {yes + no > 0 && <li className="tpg-stat"><strong>{Math.round((yes / (yes + no)) * 100)}%</strong>marcaram como útil</li>}
        </ul>

        <div className="tpg-hero__tools">
          <label className="tpg-search">
            <i className="ti ti-search" aria-hidden="true" />
            <span className="pub-sr-only">Buscar artigos</span>
            <input type="search" placeholder="Buscar por título ou conteúdo" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && (
              <button type="button" className="tpg-search__clear" aria-label="Limpar busca" onClick={() => setSearchTerm('')}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            )}
          </label>
        </div>
      </header>

      {error && (
        <div className="tpg-alert" role="alert">
          <i className="ti ti-alert-circle" aria-hidden="true" /><span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Fechar aviso"><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
      )}

      <div className="tpg-toolbar">
        <div className="tpg-chips" style={{ marginTop: 0 }}>
          <button type="button" className="tpg-chip" aria-pressed={!activeCategory} onClick={() => setActiveCategory('')}>
            <i className="ti ti-layout-grid" aria-hidden="true" />Todas
            <span className="tpg-chip__count">{articles.length}</span>
          </button>
          {categoryChips.map((id) => {
            const meta = articleCategoryMeta(id);
            return (
              <button key={id} type="button" className="tpg-chip" aria-pressed={activeCategory === id} onClick={() => setActiveCategory(activeCategory === id ? '' : id)}>
                <i className={`ti ${meta.icon}`} aria-hidden="true" />{meta.label}
                <span className="tpg-chip__count">{categoryCounts.get(id) || 0}</span>
              </button>
            );
          })}
        </div>
        <div className="tpg-seg" role="group" aria-label="Situação">
          <button type="button" aria-pressed={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Todos</button>
          <button type="button" aria-pressed={statusFilter === 'public'} onClick={() => setStatusFilter('public')}>Publicados</button>
          <button type="button" aria-pressed={statusFilter === 'draft'} onClick={() => setStatusFilter('draft')}>Rascunhos</button>
        </div>
      </div>

      <section className="tpg-card tpg-section">
        <header className="tpg-section__head">
          <h2>Artigos</h2>
          <span className="tpg-count">{filtered.length} de {articles.length}</span>
        </header>

        {loading ? (
          <div style={{ padding: '0 20px 20px', display: 'grid', gap: 10 }}>{[0, 1, 2].map((n) => <div key={n} className="tpg-skeleton" style={{ height: 70 }} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="tpg-empty">
            <span className="pub-gicon pub-gicon--neutral" aria-hidden="true"><i className={`ti ${articles.length === 0 ? 'ti-book-2' : 'ti-search-off'}`} /></span>
            <h3>{articles.length === 0 ? 'Nenhum artigo ainda' : 'Nenhum artigo com esses filtros'}</h3>
            <p>{articles.length === 0 ? 'Escreva o primeiro: o que as pessoas mais perguntam para a TI?' : 'Tente outra palavra, categoria ou situação.'}</p>
            {articles.length === 0 && (
              <button type="button" className="tpg-btn tpg-btn--primary" onClick={() => openForm()}><i className="ti ti-plus" aria-hidden="true" />Novo artigo</button>
            )}
          </div>
        ) : (
          <ul className="tpg-rows">
            {filtered.map((a) => {
              const meta = articleCategoryMeta(a.category);
              const votes = (Number(a.helpful_yes) || 0) + (Number(a.helpful_no) || 0);
              return (
                <li key={a.id} className="tpg-row km-row">
                  <span className={`pub-gicon ${meta.tone ? `pub-gicon--${meta.tone}` : ''} km-row__icon`} aria-hidden="true"><i className={`ti ${meta.icon}`} /></span>
                  <button type="button" className="km-row__main" onClick={() => openForm(a)}>
                    <strong>{a.title}</strong>
                    <span>{stripMarkdown(a.content).slice(0, 150)}</span>
                  </button>
                  <div className="km-row__meta">
                    <span className={`tpg-badge tpg-badge--dot ${a.is_public ? 'tpg-badge--ok' : 'tpg-badge--muted'}`}>{a.is_public ? 'Publicado' : 'Rascunho'}</span>
                    <span className="km-row__nums">
                      <span title="Leituras"><i className="ti ti-eye" aria-hidden="true" />{a.views_count || 0}</span>
                      {votes > 0 && (
                        <span title="Marcaram como útil / não útil">
                          <i className="ti ti-thumb-up" aria-hidden="true" />{a.helpful_yes || 0}
                          <i className="ti ti-thumb-down" aria-hidden="true" />{a.helpful_no || 0}
                        </span>
                      )}
                      <span>{dateLabel(a.created_at)}</span>
                    </span>
                  </div>
                  <div className="km-row__actions">
                    {a.is_public && (
                      <a className="tpg-icon-btn" href={`/central#${a.id}`} target="_blank" rel="noopener noreferrer" title="Ver na central" aria-label={`Ver "${a.title}" na central`}>
                        <i className="ti ti-external-link" aria-hidden="true" />
                      </a>
                    )}
                    <button type="button" className="tpg-icon-btn" onClick={() => openForm(a)} title="Editar" aria-label={`Editar "${a.title}"`}>
                      <i className="ti ti-pencil" aria-hidden="true" />
                    </button>
                    <button type="button" className="tpg-icon-btn tpg-icon-btn--danger" onClick={() => setDeleteId(a.id)} title="Excluir" aria-label={`Excluir "${a.title}"`}>
                      <i className="ti ti-trash" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Excluir artigo?"
        message="O artigo sai da Central de dúvidas e não pode ser recuperado."
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
