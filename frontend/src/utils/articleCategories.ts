/**
 * Categorias dos artigos da Central de dúvidas, num lugar só.
 *
 * O editor interno (/admin/conhecimento) e a página pública (/central) leem e
 * gravam a mesma tabela. Antes, cada lado tinha a própria lista ("FAQ" de um
 * lado, "faq" do outro) e os artigos criados pela TI não apareciam nos filtros
 * públicos. Nomes antigos continuam reconhecidos por `normalizeArticleCategory`.
 */
export interface ArticleCategory {
  id: string;
  label: string;
  icon: string;
  /** Tom do ícone com volume (pub-gicon--*). Vazio = verde. */
  tone: '' | 'administrativo' | 'rh' | 'neutral';
}

export const ARTICLE_CATEGORIES: ArticleCategory[] = [
  { id: 'getting-started', label: 'Primeiros passos', icon: 'ti-flag', tone: '' },
  { id: 'troubleshooting', label: 'Soluções práticas', icon: 'ti-tool', tone: 'administrativo' },
  { id: 'faq', label: 'Dúvidas frequentes', icon: 'ti-help', tone: 'rh' },
  { id: 'tutorials', label: 'Passo a passo', icon: 'ti-list-numbers', tone: '' },
  { id: 'institutional', label: 'Documentos institucionais', icon: 'ti-building-bank', tone: 'neutral' },
];

// Nomes usados antes da unificação.
const LEGACY: Record<string, string> = {
  faq: 'faq',
  'dúvidas frequentes': 'faq',
  tutoriais: 'tutorials',
  tutorial: 'tutorials',
  tutorials: 'tutorials',
  troubleshooting: 'troubleshooting',
  'soluções práticas': 'troubleshooting',
  institucional: 'institutional',
  institutional: 'institutional',
  'primeiros passos': 'getting-started',
  'getting-started': 'getting-started',
};

/** Id da categoria conhecida, ou o próprio texto quando é uma categoria livre. */
export const normalizeArticleCategory = (raw?: string | null) => {
  const value = (raw || '').trim();
  return LEGACY[value.toLowerCase()] ?? value;
};

export const articleCategoryMeta = (raw?: string | null): ArticleCategory => {
  const id = normalizeArticleCategory(raw);
  return ARTICLE_CATEGORIES.find((c) => c.id === id)
    ?? { id, label: id || 'Sem categoria', icon: 'ti-file-text', tone: 'neutral' };
};
