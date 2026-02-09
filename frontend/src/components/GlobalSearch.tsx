import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/GlobalSearch.css';

interface SearchResult {
  // Equipment results
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
  
  // Person results
  name?: string;
  cpf?: string;
  department?: string;
  equipment_count?: number;
  
  // Movement results
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

const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      const token = localStorage.getItem('token');
      const response = await axios.get<SearchResponse>(
        `http://localhost:3001/api/inventory/search?q=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResults(response.data);
      setIsOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults(null);
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

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string; color: string } } = {
      available: { label: 'Disponível', color: '#10b981' },
      in_use: { label: 'Em Uso', color: '#3b82f6' },
      maintenance: { label: 'Manutenção', color: '#f59e0b' },
      storage: { label: 'Estoque', color: '#6b7280' },
      disposed: { label: 'Descartado', color: '#ef4444' }
    };
    
    const config = statusMap[status] || { label: status, color: '#6b7280' };
    return <span className="status-badge" style={{ backgroundColor: config.color }}>{config.label}</span>;
  };

  return (
    <div className="global-search" ref={searchRef}>
      <div className="search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="🔍 Buscar equipamento, pessoa ou movimento..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
        {loading && <div className="search-spinner">⏳</div>}
      </div>

      {isOpen && results && (
        <div className="search-results-dropdown">
          <div className="search-results-header">
            <span>{results.totalResults} resultado{results.totalResults !== 1 ? 's' : ''} para "{results.query}"</span>
          </div>

          {/* Equipments Section */}
          {results.results.equipments.length > 0 && (
            <div className="results-section">
              <div className="section-header">💻 Equipamentos ({results.results.equipments.length})</div>
              {results.results.equipments.map((item, index) => (
                <div
                  key={index}
                  className="result-item"
                  onClick={() => handleEquipmentClick(item.id!)}
                >
                  <div className="result-icon">📦</div>
                  <div className="result-content">
                    <div className="result-title">
                      <strong>{item.code}</strong> - {item.type} {item.brand} {item.model}
                    </div>
                    <div className="result-meta">
                      {item.serial_number && <span>SN: {item.serial_number}</span>}
                      {item.responsible_name && <span>👤 {item.responsible_name}</span>}
                      {item.unit && <span>🏢 {item.unit}</span>}
                    </div>
                  </div>
                  <div className="result-badge">
                    {item.status && getStatusBadge(item.status)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* People Section */}
          {results.results.people.length > 0 && (
            <div className="results-section">
              <div className="section-header">👥 Pessoas ({results.results.people.length})</div>
              {results.results.people.map((item, index) => (
                <div
                  key={index}
                  className="result-item"
                  onClick={() => handlePersonClick(item.name!)}
                >
                  <div className="result-icon">👤</div>
                  <div className="result-content">
                    <div className="result-title">
                      <strong>{item.name}</strong>
                    </div>
                    <div className="result-meta">
                      {item.department && <span>💼 {item.department}</span>}
                      {item.unit && <span>🏢 {item.unit}</span>}
                      {item.equipment_count !== undefined && (
                        <span>📦 {item.equipment_count} equipamento{item.equipment_count !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Movements Section */}
          {results.results.movements.length > 0 && (
            <div className="results-section">
              <div className="section-header">🔄 Movimentações ({results.results.movements.length})</div>
              {results.results.movements.map((item, index) => (
                <div
                  key={index}
                  className="result-item"
                  onClick={() => handleMovementClick(item.movement_number!)}
                >
                  <div className="result-icon">📋</div>
                  <div className="result-content">
                    <div className="result-title">
                      <strong>{item.movement_number}</strong> - {item.type === 'delivery' ? 'Entrega' : 'Devolução'}
                    </div>
                    <div className="result-meta">
                      {item.equipment_code && <span>📦 {item.equipment_code}</span>}
                      {item.responsible_name && <span>👤 {item.responsible_name}</span>}
                      {item.date && <span>📅 {new Date(item.date).toLocaleDateString('pt-BR')}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.totalResults === 0 && (
            <div className="no-results">
              <p>Nenhum resultado encontrado para "{results.query}"</p>
              <small>Tente buscar por código, nome, marca ou modelo</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
