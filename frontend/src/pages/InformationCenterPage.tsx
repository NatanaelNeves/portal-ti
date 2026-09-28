import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/InformationCenterPage.css';
import { BACKEND_URL } from '../services/api';
import MiniMarkdown, { stripMarkdown } from '../components/MiniMarkdown';
import { ARTICLE_CATEGORIES, articleCategoryMeta, normalizeArticleCategory } from '../utils/articleCategories';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

// Mesmas categorias do editor interno (utils/articleCategories).
const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: 'ti-layout-grid' },
  ...ARTICLE_CATEGORIES.map((c) => ({ id: c.id, name: c.label, icon: c.icon })),
];

const CATEGORY_TONE: Record<string, string> = Object.fromEntries(ARTICLE_CATEGORIES.map((c) => [c.id, c.tone]));

const categoryMeta = (id: string) => {
  const meta = articleCategoryMeta(id);
  return { id: meta.id, name: meta.label, icon: meta.icon };
};

const ARTICLES_PER_PAGE = 9;

export default function InformationCenterPage() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<Record<string, boolean>>({});
  const [articlesPage, setArticlesPage] = useState(1);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const sendFeedback = async (articleId: string, helpful: boolean) => {
    if (feedbackSent[articleId]) return;
    try {
      await fetch(`${BACKEND_URL}/api/information-articles/${articleId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful }),
      });
    } catch { /* silent */ }
    setFeedbackSent(prev => ({ ...prev, [articleId]: true }));
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${BACKEND_URL}/api/information-articles?public=true`);

      if (!response.ok) {
        throw new Error('Não foi possível carregar os artigos. Tente de novo em instantes.');
      }

      const data = await response.json();
      // Nomes antigos de categoria ("FAQ", "Tutoriais"…) viram os ids atuais.
      const loaded: Article[] = (data.articles || []).map((a: Article) => ({ ...a, category: normalizeArticleCategory(a.category) }));
      setArticles(loaded);

      // As sugestões do "Abrir chamado" apontam para /central#<id>.
      const linkedId = decodeURIComponent(window.location.hash.slice(1));
      const linked = linkedId && loaded.find((article) => article.id === linkedId);
      if (linked) setSelectedArticle(linked);
    } catch (err: any) {
      setError(err instanceof TypeError
        ? 'Sem conexão com o portal. Confira sua internet e tente de novo.'
        : err.message || 'Não foi possível carregar os artigos.');
    } finally {
      setLoading(false);
    }
  };

  const openArticle = (article: Article | null) => {
    setSelectedArticle(article);
    window.history.replaceState(null, '', article ? `#${article.id}` : window.location.pathname);
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const chooseCategory = (id: string) => {
    setSelectedCategory(id);
    setArticlesPage(1);
    if (selectedArticle) openArticle(null);
  };

  const term = searchTerm.trim().toLowerCase();
  const allFilteredArticles = articles.filter((article) => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch =
      !term ||
      article.title.toLowerCase().includes(term) ||
      article.content.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  const totalArticlePages = Math.ceil(allFilteredArticles.length / ARTICLES_PER_PAGE);
  const filteredArticles = allFilteredArticles.slice(
    (articlesPage - 1) * ARTICLES_PER_PAGE,
    articlesPage * ARTICLES_PER_PAGE,
  );

  const countFor = (id: string) =>
    id === 'all' ? articles.length : articles.filter((article) => article.category === id).length;

  // Categorias livres (criadas no editor com "Outro") também viram filtro.
  const extraCategories = Array.from(new Set(articles.map((a) => a.category)))
    .filter((id) => id && !CATEGORIES.some((c) => c.id === id))
    .map((id) => categoryMeta(id));
  const visibleCategories = [...CATEGORIES, ...extraCategories]
    .filter((cat) => cat.id === 'all' || countFor(cat.id) > 0 || loading);

  return (
    <div className="pub-page kb">
      <section className="kb-hero pub-aurora">
        <div className="pub-wrap kb-hero__inner">
          <h1>Central de dúvidas</h1>
          <p>Tutoriais e respostas rápidas para resolver sozinho, sem esperar atendimento.</p>

          <label className="kb-search" htmlFor="kb-search-input">
            <i className="ti ti-search" aria-hidden="true" />
            <span className="pub-sr-only">Buscar artigos</span>
            <input
              id="kb-search-input"
              type="search"
              placeholder="Ex.: como trocar o toner da impressora"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setArticlesPage(1);
                if (selectedArticle) openArticle(null);
              }}
            />
            {searchTerm && (
              <button type="button" className="kb-search__clear" aria-label="Limpar busca" onClick={() => setSearchTerm('')}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            )}
          </label>
        </div>
      </section>

      <nav className="kb-cats" aria-label="Categorias">
        <div className="pub-wrap kb-cats__scroller">
          {visibleCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`kb-chip ${selectedCategory === cat.id ? 'is-active' : ''}`}
              aria-pressed={selectedCategory === cat.id}
              onClick={() => chooseCategory(cat.id)}
            >
              <i className={`ti ${cat.icon}`} aria-hidden="true" />
              {cat.name}
              {!loading && !error && <span className="kb-chip__count">{countFor(cat.id)}</span>}
            </button>
          ))}
        </div>
      </nav>

      <div className="pub-wrap kb-body" ref={contentRef}>
        {error && (
          <div className="pub-alert kb-alert" role="alert">
            <i className="ti ti-alert-circle" aria-hidden="true" />
            <span>{error}</span>
            <button type="button" className="kb-alert__retry" onClick={fetchArticles}>Tentar de novo</button>
          </div>
        )}

        {loading ? (
          <ul className="kb-grid" aria-busy="true" aria-label="Carregando artigos">
            {[0, 1, 2, 3, 4, 5].map((n) => <li key={n} className="kb-skeleton" />)}
          </ul>
        ) : selectedArticle ? (
          <article className="kb-article">
            <button type="button" className="kb-back" onClick={() => openArticle(null)}>
              <i className="ti ti-arrow-left" aria-hidden="true" />
              Todos os artigos
            </button>

            <span className={`kb-card__cat kb-tone--${CATEGORY_TONE[selectedArticle.category] ?? ''}`}>
              <i className={`ti ${categoryMeta(selectedArticle.category).icon}`} aria-hidden="true" />
              {categoryMeta(selectedArticle.category).name}
            </span>
            <h2>{selectedArticle.title}</h2>
            <MiniMarkdown className="kb-article__content pub-md" source={selectedArticle.content} />

            <div className="kb-feedback">
              {feedbackSent[selectedArticle.id] ? (
                <p className="kb-feedback__thanks">
                  <i className="ti ti-heart-handshake" aria-hidden="true" />
                  Obrigado. Sua resposta ajuda a melhorar os artigos.
                </p>
              ) : (
                <>
                  <p>Este artigo resolveu sua dúvida?</p>
                  <div className="kb-feedback__actions">
                    <button type="button" className="kb-vote" onClick={() => sendFeedback(selectedArticle.id, true)}>
                      <i className="ti ti-thumb-up" aria-hidden="true" />
                      Sim
                    </button>
                    <button type="button" className="kb-vote" onClick={() => sendFeedback(selectedArticle.id, false)}>
                      <i className="ti ti-thumb-down" aria-hidden="true" />
                      Não
                    </button>
                  </div>
                </>
              )}
            </div>
          </article>
        ) : filteredArticles.length === 0 && !error ? (
          <div className="kb-empty">
            <span className="pub-gicon pub-gicon--neutral" aria-hidden="true"><i className="ti ti-search-off" /></span>
            <h2>{term ? `Nada encontrado para "${searchTerm.trim()}"` : 'Ainda não há artigos aqui'}</h2>
            <p>
              {term
                ? 'Tente outras palavras ou veja todas as categorias.'
                : 'Os artigos desta categoria aparecem aqui assim que forem publicados.'}
            </p>
            {term && (
              <button type="button" className="pub-btn pub-btn--ghost" onClick={() => { setSearchTerm(''); chooseCategory('all'); }}>
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <>
            {term && (
              <p className="kb-result-count">
                {allFilteredArticles.length === 1 ? '1 artigo encontrado' : `${allFilteredArticles.length} artigos encontrados`}
              </p>
            )}
            <ul className="kb-grid">
              {filteredArticles.map((article) => {
                const meta = categoryMeta(article.category);
                const tone = CATEGORY_TONE[article.category] ?? '';
                return (
                  <li key={article.id}>
                    <button type="button" className="kb-card" onClick={() => openArticle(article)}>
                      <span className="kb-card__head">
                        <span className={`pub-gicon ${tone ? `pub-gicon--${tone}` : ''}`} aria-hidden="true">
                          <i className={`ti ${meta.icon}`} />
                        </span>
                        <span className={`kb-card__cat kb-tone--${tone}`}>{meta.name}</span>
                      </span>
                      <strong className="kb-card__title">{article.title}</strong>
                      <span className="kb-card__excerpt">{stripMarkdown(article.content)}</span>
                      <span className="kb-card__more">
                        Ler artigo
                        <i className="ti ti-arrow-right" aria-hidden="true" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {totalArticlePages > 1 && (
              <nav className="kb-pages" aria-label="Páginas de artigos">
                <button
                  type="button"
                  className="kb-pages__btn"
                  disabled={articlesPage === 1}
                  onClick={() => { setArticlesPage(p => p - 1); contentRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                >
                  <i className="ti ti-chevron-left" aria-hidden="true" />
                  Anterior
                </button>
                <span className="kb-pages__info">Página {articlesPage} de {totalArticlePages}</span>
                <button
                  type="button"
                  className="kb-pages__btn"
                  disabled={articlesPage === totalArticlePages}
                  onClick={() => { setArticlesPage(p => p + 1); contentRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                >
                  Próxima
                  <i className="ti ti-chevron-right" aria-hidden="true" />
                </button>
              </nav>
            )}
          </>
        )}

        <section className="kb-help pub-aurora" aria-labelledby="kb-help-title">
          <div>
            <h2 id="kb-help-title">Não encontrou o que precisava?</h2>
            <p>Abra um chamado e a equipe certa cuida do seu caso.</p>
          </div>
          <button type="button" className="pub-btn pub-btn--sun" onClick={() => navigate('/abrir-chamado')}>
            <i className="ti ti-message-plus" aria-hidden="true" />
            Abrir um chamado
          </button>
        </section>
      </div>
    </div>
  );
}
