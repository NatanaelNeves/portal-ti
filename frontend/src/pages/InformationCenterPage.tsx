import { useState, useEffect } from 'react';
import '../styles/InformationCenterPage.css';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

export default function InformationCenterPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const categories = [
    { id: 'all', name: 'Todos os Tópicos' },
    { id: 'getting-started', name: 'Primeiros Passos' },
    { id: 'troubleshooting', name: 'Soluções Práticas' },
    { id: 'faq', name: 'Dúvidas Frequentes' },
    { id: 'tutorials', name: 'Tutoriais Passo a Passo' },
    { id: 'institutional', name: 'Documentos Institucionais' },
  ];

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/information-articles?public=true');

      if (!response.ok) {
        throw new Error('Erro ao carregar artigos');
      }

      const data = await response.json();
      setArticles(data.articles || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar artigos');
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter((article) => {
    const matchesCategory =
      selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch =
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="information-center-page">
      <div className="center-header">
        <h1>� Central de Dúvidas</h1>
        <p>Encontre respostas, tutoriais e documentação para apoiar seu trabalho</p>
      </div>

      <div className="center-container">
        {/* Search Bar */}
        <div className="search-section">
          <input
            type="text"
            placeholder="O que você precisa encontrar? Ex: como trocar toner da impressora..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Categories */}
        <div className="categories-section">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loading">Carregando artigos...</div>
        ) : selectedArticle ? (
          /* Article Detail View */
          <div className="article-detail">
            <button
              className="back-btn"
              onClick={() => setSelectedArticle(null)}
            >
              ← Voltar
            </button>
            <h2>{selectedArticle.title}</h2>
            <p className="article-meta">
              Categoria: <span>{selectedArticle.category}</span>
            </p>
            <div className="article-content">{selectedArticle.content}</div>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum artigo encontrado</p>
          </div>
        ) : (
          /* Articles List */
          <div className="articles-grid">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="article-card"
                onClick={() => setSelectedArticle(article)}
              >
                <div className="article-category">{article.category}</div>
                <h3>{article.title}</h3>
                <p>{article.content.substring(0, 100)}...</p>
                <a href="#" className="read-more">
                  Ler mais →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Access Section */}
      <section className="quick-access">
        <h3>Acesso Rápido</h3>
        <div className="quick-links">
          <a href="/abrir-chamado" className="quick-link">
            <span>📝</span>
            <p>Como abrir um chamado</p>
          </a>
          <a href="#" className="quick-link">
            <span>🔧</span>
            <p>Problemas comuns</p>
          </a>
          <a href="#" className="quick-link">
            <span>💡</span>
            <p>Dicas e truques</p>
          </a>
          <a href="#" className="quick-link">
            <span>📞</span>
            <p>Entrar em contato</p>
          </a>
        </div>
      </section>
    </div>
  );
}
