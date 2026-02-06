import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/KnowledgeManagementPage.css';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  is_public: boolean;
  created_at: string;
  views_count: number;
}

export default function KnowledgeManagementPage() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    is_public: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchArticles();
  }, [navigate]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');
      const response = await fetch('/api/knowledge', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
      }
    } catch (err) {
      setError('Erro ao carregar artigos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('internal_token');

    try {
      const url = editingArticle 
        ? `/api/knowledge/${editingArticle.id}` 
        : '/api/knowledge';
      const method = editingArticle ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowForm(false);
        setEditingArticle(null);
        setFormData({ title: '', content: '', category: '', is_public: true });
        fetchArticles();
      } else {
        setError('Erro ao salvar artigo');
      }
    } catch (err) {
      setError('Erro ao salvar artigo');
    }
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      category: article.category,
      is_public: article.is_public,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este artigo?')) return;

    const token = localStorage.getItem('internal_token');
    try {
      const response = await fetch(`/api/knowledge/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchArticles();
      }
    } catch (err) {
      setError('Erro ao excluir artigo');
    }
  };

  return (
    <div className="knowledge-management-page">
      <div className="page-header">
        <h1>📚 Base de Conhecimento</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              setEditingArticle(null);
              setFormData({ title: '', content: '', category: '', is_public: true });
            }
          }}
        >
          {showForm ? '✕ Cancelar' : '+ Novo Artigo'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="article-form-card">
          <h2>{editingArticle ? 'Editar Artigo' : 'Criar Novo Artigo'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Título *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Título do artigo"
              />
            </div>

            <div className="form-group">
              <label>Categoria</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Hardware, Software, Rede"
              />
            </div>

            <div className="form-group">
              <label>Conteúdo *</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                rows={10}
                placeholder="Conteúdo do artigo em Markdown..."
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                />
                <span>Artigo público (visível para todos os usuários)</span>
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingArticle ? '💾 Salvar Alterações' : '➕ Criar Artigo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Carregando artigos...</div>
      ) : (
        <div className="articles-grid">
          {articles.length === 0 ? (
            <div className="no-articles">
              <p>Nenhum artigo cadastrado ainda.</p>
              <p>Crie o primeiro artigo para a base de conhecimento!</p>
            </div>
          ) : (
            articles.map((article) => (
              <div key={article.id} className="article-card">
                <div className="article-header">
                  <h3>{article.title}</h3>
                  <div className="article-badges">
                    {article.is_public ? (
                      <span className="badge badge-public">🌐 Público</span>
                    ) : (
                      <span className="badge badge-private">🔒 Interno</span>
                    )}
                    {article.category && (
                      <span className="badge badge-category">{article.category}</span>
                    )}
                  </div>
                </div>
                <div className="article-content">
                  {article.content.substring(0, 150)}
                  {article.content.length > 150 && '...'}
                </div>
                <div className="article-footer">
                  <span className="article-views">👁️ {article.views_count} visualizações</span>
                  <span className="article-date">
                    {new Date(article.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="article-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleEdit(article)}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(article.id)}
                  >
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
