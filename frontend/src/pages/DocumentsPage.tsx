import { useCallback, useEffect, useState } from 'react';
import api, { BACKEND_URL } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import { showToast } from '../utils/toast';
import '../styles/DocumentsPage.css';

interface Doc {
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

const DOC_TYPES: Record<string, { label: string; plural: string; icon: string; tone: string; stat: keyof DocumentStats }> = {
  manual: { label: 'Manual', plural: 'Manuais', icon: 'ti-book', tone: '', stat: 'manuais' },
  policy: { label: 'Política', plural: 'Políticas', icon: 'ti-certificate', tone: 'rh', stat: 'politicas' },
  procedure: { label: 'Procedimento', plural: 'Procedimentos', icon: 'ti-list-check', tone: '', stat: 'procedimentos' },
  form: { label: 'Formulário', plural: 'Formulários', icon: 'ti-forms', tone: 'administrativo', stat: 'formularios' },
  template: { label: 'Modelo', plural: 'Modelos', icon: 'ti-template', tone: 'administrativo', stat: 'modelos' },
  other: { label: 'Outro', plural: 'Outros', icon: 'ti-file', tone: 'neutral', stat: 'outros' },
};

const fileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
};

const fileExt = (url: string | null) => (url?.split('.').pop() || '').toUpperCase().slice(0, 4);

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPublic, setFilterPublic] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Doc | null>(null);
  const [form, setForm] = useState({ title: '', description: '', document_type: 'manual', is_public: false });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState('');

  // Espera a pessoa parar de digitar antes de consultar o servidor.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterType) params.document_type = filterType;
      if (filterPublic) params.is_public = filterPublic;
      if (debounced) params.search = debounced;
      const [docsRes, statsRes] = await Promise.all([
        api.get('/documents', { params }),
        api.get('/documents/stats'),
      ]);
      setDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);
      setStats(statsRes.data);
      setError('');
    } catch {
      setError('Não foi possível carregar os documentos. Tente de novo.');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterPublic, debounced]);

  useEffect(() => { void fetchDocuments(); }, [fetchDocuments]);

  const openForm = (doc?: Doc) => {
    setEditing(doc ?? null);
    setForm(doc
      ? { title: doc.title, description: doc.description || '', document_type: doc.document_type, is_public: doc.is_public }
      : { title: '', description: '', document_type: 'manual', is_public: false });
    setFile(null);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); setFile(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/documents/${editing.id}`, form);
        showToast.success('Documento atualizado.');
      } else {
        const fd = new FormData();
        fd.append('title', form.title);
        fd.append('description', form.description);
        fd.append('document_type', form.document_type);
        fd.append('is_public', String(form.is_public));
        if (file) fd.append('file', file);
        await api.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        showToast.success('Documento cadastrado.');
      }
      closeForm();
      void fetchDocuments();
    } catch (err: any) {
      showToast.error(err.response?.data?.error || 'Não foi possível salvar o documento.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    try {
      await api.delete(`/documents/${id}`);
      showToast.success('Documento excluído.');
      void fetchDocuments();
    } catch {
      showToast.error('Não foi possível excluir o documento.');
    }
  };

  const download = async (doc: Doc) => {
    if (!doc.file_url) return;
    try {
      setDownloadingId(doc.id);
      const token = localStorage.getItem('internal_token');
      const res = await fetch(`${BACKEND_URL}/api/documents/${doc.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'O arquivo não pôde ser baixado.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.title}.${doc.file_url.split('.').pop() || 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showToast.error(err instanceof TypeError ? 'Sem conexão com o servidor.' : err.message);
    } finally {
      setDownloadingId('');
    }
  };

  const count = (key: keyof DocumentStats) => Number(stats?.[key] || 0);

  return (
    <div className="tpg dp">
      <header className="tpg-hero pub-aurora">
        <div className="tpg-hero__top">
          <div className="tpg-hero__title">
            <span className="pub-gicon pub-gicon--administrativo" aria-hidden="true"><i className="ti ti-folders" /></span>
            <div>
              <h1>Documentos</h1>
              <p>Manuais, políticas, procedimentos e modelos da instituição, num lugar só.</p>
            </div>
          </div>
          <div className="tpg-hero__actions">
            <button type="button" className="tpg-btn tpg-btn--sun" onClick={() => openForm()}>
              <i className="ti ti-upload" aria-hidden="true" />Novo documento
            </button>
          </div>
        </div>

        {stats && (
          <ul className="tpg-stats" aria-label="Resumo">
            <li className="tpg-stat"><strong>{count('total')}</strong>documentos</li>
            <li className="tpg-stat"><strong>{count('publicos')}</strong>públicos</li>
            <li className="tpg-stat"><strong>{count('privados')}</strong>privados</li>
            <li className="tpg-stat"><strong>{count('total_views')}</strong>visualizações</li>
          </ul>
        )}

        <div className="tpg-hero__tools">
          <label className="tpg-search">
            <i className="ti ti-search" aria-hidden="true" />
            <span className="pub-sr-only">Buscar documentos</span>
            <input type="search" placeholder="Buscar por título ou descrição" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <button type="button" className="tpg-search__clear" aria-label="Limpar busca" onClick={() => setSearch('')}><i className="ti ti-x" aria-hidden="true" /></button>
            )}
          </label>
        </div>
      </header>

      {error && (
        <div className="tpg-alert" role="alert">
          <i className="ti ti-alert-circle" aria-hidden="true" /><span>{error}</span>
          <button type="button" onClick={() => void fetchDocuments()} aria-label="Tentar de novo"><i className="ti ti-refresh" aria-hidden="true" /></button>
        </div>
      )}

      <div className="tpg-toolbar">
        <div className="tpg-chips" style={{ marginTop: 0 }}>
          <button type="button" className="tpg-chip" aria-pressed={!filterType} onClick={() => setFilterType('')}>
            <i className="ti ti-layout-grid" aria-hidden="true" />Todos
            {stats && <span className="tpg-chip__count">{count('total')}</span>}
          </button>
          {Object.entries(DOC_TYPES).map(([key, t]) => (
            <button key={key} type="button" className="tpg-chip" aria-pressed={filterType === key} onClick={() => setFilterType(filterType === key ? '' : key)}>
              <i className={`ti ${t.icon}`} aria-hidden="true" />{t.plural}
              {stats && <span className="tpg-chip__count">{count(t.stat)}</span>}
            </button>
          ))}
        </div>
        <div className="tpg-seg" role="group" aria-label="Visibilidade">
          <button type="button" aria-pressed={filterPublic === ''} onClick={() => setFilterPublic('')}>Todos</button>
          <button type="button" aria-pressed={filterPublic === 'true'} onClick={() => setFilterPublic('true')}>Públicos</button>
          <button type="button" aria-pressed={filterPublic === 'false'} onClick={() => setFilterPublic('false')}>Privados</button>
        </div>
      </div>

      {loading ? (
        <div className="dpd-grid">{[0, 1, 2, 3, 4, 5].map((n) => <div key={n} className="tpg-skeleton" style={{ height: 190 }} />)}</div>
      ) : documents.length === 0 ? (
        <section className="tpg-card tpg-section">
          <div className="tpg-empty">
            <span className="pub-gicon pub-gicon--neutral" aria-hidden="true"><i className={`ti ${debounced || filterType || filterPublic ? 'ti-search-off' : 'ti-folder-open'}`} /></span>
            <h3>{debounced || filterType || filterPublic ? 'Nenhum documento com esses filtros' : 'Nenhum documento cadastrado'}</h3>
            <p>{debounced || filterType || filterPublic ? 'Tente outra palavra, tipo ou visibilidade.' : 'Suba o primeiro manual, política ou modelo.'}</p>
            {!debounced && !filterType && !filterPublic && (
              <button type="button" className="tpg-btn tpg-btn--primary" onClick={() => openForm()}><i className="ti ti-upload" aria-hidden="true" />Novo documento</button>
            )}
          </div>
        </section>
      ) : (
        <ul className="dpd-grid">
          {documents.map((doc) => {
            const t = DOC_TYPES[doc.document_type] || DOC_TYPES.other;
            return (
              <li key={doc.id} className="tpg-card dpd-card">
                <div className="dp-card__top">
                  <span className={`pub-gicon ${t.tone ? `pub-gicon--${t.tone}` : ''} dp-card__icon`} aria-hidden="true">
                    <i className={`ti ${t.icon}`} />
                  </span>
                  <div className="dp-card__tags">
                    <span className="dp-card__type">{t.label}</span>
                    <span className={`tpg-badge ${doc.is_public ? 'tpg-badge--ok' : 'tpg-badge--muted'}`}>
                      <i className={`ti ${doc.is_public ? 'ti-world' : 'ti-lock'}`} aria-hidden="true" />{doc.is_public ? 'Público' : 'Privado'}
                    </span>
                  </div>
                </div>
                <h3 className="dp-card__title">{doc.title}</h3>
                {doc.description && <p className="dp-card__desc">{doc.description}</p>}
                <p className="dp-card__meta">
                  {doc.file_url && <span className="dp-ext">{fileExt(doc.file_url)}{doc.file_size ? `, ${fileSize(doc.file_size)}` : ''}</span>}
                  <span>{new Date(doc.created_at).toLocaleDateString('pt-BR')}</span>
                  {doc.uploaded_by_name && <span>por {doc.uploaded_by_name}</span>}
                  <span title="Visualizações"><i className="ti ti-eye" aria-hidden="true" /> {doc.views_count}</span>
                </p>
                <div className="dp-card__actions">
                  {doc.file_url ? (
                    <button type="button" className="tpg-btn tpg-btn--primary tpg-btn--sm" onClick={() => void download(doc)} disabled={downloadingId === doc.id}>
                      <i className="ti ti-download" aria-hidden="true" />{downloadingId === doc.id ? 'Baixando…' : 'Baixar'}
                    </button>
                  ) : (
                    <span className="tpg-muted">Sem arquivo</span>
                  )}
                  <span className="dp-card__spacer" />
                  <button type="button" className="tpg-icon-btn" onClick={() => openForm(doc)} title="Editar" aria-label={`Editar ${doc.title}`}><i className="ti ti-pencil" aria-hidden="true" /></button>
                  <button type="button" className="tpg-icon-btn tpg-icon-btn--danger" onClick={() => setDeleteId(doc.id)} title="Excluir" aria-label={`Excluir ${doc.title}`}><i className="ti ti-trash" aria-hidden="true" /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showForm && (
        <div className="tpg-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) closeForm(); }}>
          <div className="tpg-modal__box" role="dialog" aria-modal="true" aria-labelledby="dp-modal-title">
            <header className="tpg-modal__head">
              <div>
                <h2 id="dp-modal-title">{editing ? 'Editar documento' : 'Novo documento'}</h2>
                <p>{editing ? 'Para trocar o arquivo, exclua e cadastre de novo.' : 'PDF, Word, Excel, texto ou imagem, até 10 MB.'}</p>
              </div>
              <button type="button" className="tpg-icon-btn" onClick={closeForm} aria-label="Fechar"><i className="ti ti-x" aria-hidden="true" /></button>
            </header>
            <form className="tpg-form" onSubmit={(e) => void submit(e)}>
              <label className="tpg-field">
                <span>Título</span>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus placeholder="Ex.: Política de uso de equipamentos" />
              </label>
              <label className="tpg-field">
                <span>Descrição <span className="tpg-muted">(opcional)</span></span>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Para que serve e quem deve ler" />
              </label>
              <div className="tpg-field">
                <span>Tipo</span>
                <div className="dp-types" role="radiogroup" aria-label="Tipo">
                  {Object.entries(DOC_TYPES).map(([key, t]) => (
                    <button key={key} type="button" role="radio" aria-checked={form.document_type === key} className="dp-type" onClick={() => setForm({ ...form, document_type: key })}>
                      <i className={`ti ${t.icon}`} aria-hidden="true" />{t.label}
                    </button>
                  ))}
                </div>
              </div>
              {!editing && (
                <div className="tpg-field">
                  <span>Arquivo</span>
                  <label className={`dp-drop ${file ? 'has-file' : ''}`}>
                    <input type="file" className="pub-sr-only" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    <i className={`ti ${file ? 'ti-file-check' : 'ti-cloud-upload'}`} aria-hidden="true" />
                    <span>
                      <strong>{file ? file.name : 'Escolher arquivo'}</strong>
                      <small>{file ? fileSize(file.size) : 'Clique para selecionar'}</small>
                    </span>
                  </label>
                </div>
              )}
              <label className="tpg-switch">
                <span>
                  <strong>Documento público</strong>
                  <small>Desligado, fica visível só para a equipe interna</small>
                </span>
                <input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} />
                <i aria-hidden="true" />
              </label>
              <div className="tpg-form__actions">
                <button type="button" className="tpg-btn" onClick={closeForm}>Cancelar</button>
                <button type="submit" className="tpg-btn tpg-btn--primary" disabled={saving}>
                  {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Excluir documento?"
        message="O documento e o arquivo saem do portal e não podem ser recuperados."
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
