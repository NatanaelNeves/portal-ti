import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { statusPresentation } from '../utils/ticketStatus';
import '../styles/GlobalSearch.css';

interface SearchResult {
  id?: string;
  code?: string;
  category?: string;
  type?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  status?: string;
  unit?: string;
  responsible_name?: string;
  name?: string;
  cpf?: string;
  department?: string;
  equipment_count?: number;
  movement_number?: string;
  date?: string;
  equipment_code?: string;
  equipment_type?: string;
  result_type: 'equipment' | 'person' | 'movement';
}

interface SearchResponse {
  query: string;
  totalResults: number;
  results: {
    equipments: SearchResult[];
    people: SearchResult[];
    movements: SearchResult[];
  };
}

interface TicketResult { id: string; title: string; status: string; priority: string; }
interface ArticleResult { id: string; title: string; category: string; }

const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [tickets, setTickets] = useState<TicketResult[]>([]);
  const [articles, setArticles] = useState<ArticleResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Atalhos: "/" sempre abre esta busca; Ctrl+K também, a menos que a página
  // tenha a própria busca (marcada com data-page-search), que tem prioridade.
  const location = useLocation();
  const [pageHasSearch, setPageHasSearch] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setPageHasSearch(!!document.querySelector('[data-page-search]')), 300);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    };
    const handler = (e: KeyboardEvent) => {
      const ctrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      const slash = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target);
      if ((ctrlK && !document.querySelector('[data-page-search]')) || slash) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(q => query.length >= 2 ? true : q);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const performSearch = async () => {
    try {
      setLoading(true);
      const q = encodeURIComponent(query);
      const token = localStorage.getItem('internal_token');
      const authHeader = token ? { Authorization: `Bearer ${token}` } : undefined;

      const [invRes, ticketRes, articleRes] = await Promise.allSettled([
        api.get<SearchResponse>(`/inventory/search?q=${q}`),
        fetch(`${api.defaults.baseURL}/tickets?search=${q}&limit=5`, authHeader ? { headers: authHeader } : undefined).then(r => r.json()),
        fetch(`${api.defaults.baseURL}/information-articles?public=true`).then(r => r.json()),
      ]);

      if (invRes.status === 'fulfilled') setResults(invRes.value.data);
      else setResults(null);

      if (ticketRes.status === 'fulfilled') {
        const data = ticketRes.value;
        // O servidor já busca em título, descrição e solicitante.
        setTickets((data.data || []).slice(0, 5));
      }

      if (articleRes.status === 'fulfilled') {
        const data = articleRes.value;
        setArticles((data.articles || []).filter((a: ArticleResult) =>
          a.title?.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 4));
      }

      setIsOpen(true);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEquipmentClick = (id: string) => {
    navigate(`/inventario/equipamento/${id}`);
    setIsOpen(false);
    setQuery('');
  };

  const handlePersonClick = (_name: string) => {
    navigate('/inventario/responsabilidades');
    setIsOpen(false);
    setQuery('');
  };

  const handleMovementClick = (_movementNumber: string) => {
    // Could navigate to a movements history page
    setIsOpen(false);
  };

  const EQUIPMENT_STATUS: Record<string, { label: string; tone: string }> = {
    available: { label: 'Disponível', tone: 'ok' },
    in_use: { label: 'Em uso', tone: 'info' },
    maintenance: { label: 'Manutenção', tone: 'warn' },
    storage: { label: 'Estoque', tone: 'muted' },
    disposed: { label: 'Descartado', tone: 'late' },
  };
  const PRIORITY: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente', critical: 'Crítica' };

  const close = () => { setIsOpen(false); setQuery(''); };
  const equipments = results?.results.equipments ?? [];
  const people = results?.results.people ?? [];
  const movements = results?.results.movements ?? [];
  const total = equipments.length + people.length + movements.length + tickets.length + articles.length;

  return (
    <div className="global-search" ref={searchRef}>
      <label className="gs-input">
        <i className="ti ti-search" aria-hidden="true" />
        <span className="pub-sr-only">Buscar chamados, equipamentos, pessoas e artigos</span>
        <input
          ref={inputRef}
          type="search"
          placeholder="Buscar chamados, equipamentos, pessoas…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          aria-expanded={isOpen}
          aria-controls="gs-results"
        />
        {loading
          ? <span className="gs-spinner" aria-hidden="true" />
          : <kbd className="gs-kbd" title={pageHasSearch ? 'Ctrl K busca nesta página' : undefined}>{pageHasSearch ? '/' : 'Ctrl K'}</kbd>}
      </label>

      {isOpen && (
        <div className="gs-dropdown" id="gs-results">
          <p className="gs-summary">
            {total === 0
              ? `Nada encontrado para "${query}". Tente código, nome, título ou categoria.`
              : `${total} ${total === 1 ? 'resultado' : 'resultados'} para "${query}"`}
          </p>

          {tickets.length > 0 && (
            <section className="gs-group">
              <h3><i className="ti ti-inbox" aria-hidden="true" />Chamados</h3>
              {tickets.map((t) => {
                const status = statusPresentation(t.status);
                return (
                  <button key={t.id} type="button" className="gs-item" onClick={() => { navigate(`/admin/chamados/${t.id}`); close(); }}>
                    <span className="gs-item__main">
                      <strong>{t.title}</strong>
                      <span>#{t.id.substring(0, 8).toUpperCase()}, prioridade {(PRIORITY[t.priority] || t.priority).toLowerCase()}</span>
                    </span>
                    <span className="gs-tag">{status.label}</span>
                  </button>
                );
              })}
            </section>
          )}

          {equipments.length > 0 && (
            <section className="gs-group">
              <h3><i className="ti ti-device-laptop" aria-hidden="true" />Equipamentos</h3>
              {equipments.map((item, index) => {
                const st = item.status ? EQUIPMENT_STATUS[item.status] ?? { label: item.status, tone: 'muted' } : null;
                return (
                  <button key={item.id || index} type="button" className="gs-item" onClick={() => handleEquipmentClick(item.id!)}>
                    <span className="gs-item__main">
                      <strong>{item.code} {[item.type, item.brand, item.model].filter(Boolean).join(' ')}</strong>
                      <span>{[item.serial_number && `Série ${item.serial_number}`, item.responsible_name, item.unit].filter(Boolean).join(', ')}</span>
                    </span>
                    {st && <span className={`gs-tag gs-tag--${st.tone}`}>{st.label}</span>}
                  </button>
                );
              })}
            </section>
          )}

          {people.length > 0 && (
            <section className="gs-group">
              <h3><i className="ti ti-user" aria-hidden="true" />Pessoas</h3>
              {people.map((item, index) => (
                <button key={`${item.name}-${index}`} type="button" className="gs-item" onClick={() => handlePersonClick(item.name!)}>
                  <span className="gs-item__main">
                    <strong>{item.name}</strong>
                    <span>
                      {[item.department, item.unit].filter(Boolean).join(', ')}
                      {item.equipment_count !== undefined && ` ${item.equipment_count} ${item.equipment_count === 1 ? 'equipamento' : 'equipamentos'}`}
                    </span>
                  </span>
                </button>
              ))}
            </section>
          )}

          {movements.length > 0 && (
            <section className="gs-group">
              <h3><i className="ti ti-arrows-exchange" aria-hidden="true" />Movimentações</h3>
              {movements.map((item, index) => (
                <button key={item.movement_number || index} type="button" className="gs-item" onClick={() => handleMovementClick(item.movement_number!)}>
                  <span className="gs-item__main">
                    <strong>{item.movement_number}, {item.type === 'delivery' ? 'entrega' : 'devolução'}</strong>
                    <span>{[item.equipment_code, item.responsible_name, item.date && new Date(item.date).toLocaleDateString('pt-BR')].filter(Boolean).join(', ')}</span>
                  </span>
                </button>
              ))}
            </section>
          )}

          {articles.length > 0 && (
            <section className="gs-group">
              <h3><i className="ti ti-help-circle" aria-hidden="true" />Central de dúvidas</h3>
              {articles.map((a) => (
                <button key={a.id} type="button" className="gs-item" onClick={() => { navigate(`/central#${a.id}`); close(); }}>
                  <span className="gs-item__main">
                    <strong>{a.title}</strong>
                    <span>{a.category}</span>
                  </span>
                </button>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
