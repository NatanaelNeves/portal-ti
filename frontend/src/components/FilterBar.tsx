import React, { useState } from 'react';
import '../styles/FilterBar.css';

export interface FilterValues {
  search?: string;
  status?: string[];
  priority?: string[];
  dateFrom?: string;
  dateTo?: string;
  assignedTo?: string;
  [key: string]: any;
}

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  onFilter: (filters: FilterValues) => void;
  showStatus?: boolean;
  showPriority?: boolean;
  showDateRange?: boolean;
  showAssignee?: boolean;
  showCustomFilters?: React.ReactNode;
  statusOptions?: FilterOption[];
  priorityOptions?: FilterOption[];
  assigneeOptions?: FilterOption[];
}

const defaultStatusOptions: FilterOption[] = [
  { value: 'open', label: 'Aberto' },
  { value: 'in_progress', label: 'Em Andamento' },
  { value: 'waiting_user', label: 'Aguardando Usuário' },
  { value: 'resolved', label: 'Resolvido' },
  { value: 'closed', label: 'Fechado' }
];

const defaultPriorityOptions: FilterOption[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Crítica' }
];

const FilterBar: React.FC<FilterBarProps> = ({
  onFilter,
  showStatus = true,
  showPriority = true,
  showDateRange = true,
  showAssignee = false,
  showCustomFilters,
  statusOptions = defaultStatusOptions,
  priorityOptions = defaultPriorityOptions,
  assigneeOptions = []
}) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string[]>([]);
  const [priority, setPriority] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleApplyFilters = () => {
    onFilter({
      search: search.trim() || undefined,
      status: status.length > 0 ? status : undefined,
      priority: priority.length > 0 ? priority : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      assignedTo: assignedTo || undefined
    });
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus([]);
    setPriority([]);
    setDateFrom('');
    setDateTo('');
    setAssignedTo('');
    onFilter({});
  };

  const handleStatusChange = (value: string) => {
    setStatus(prev => 
      prev.includes(value) 
        ? prev.filter(s => s !== value)
        : [...prev, value]
    );
  };

  const handlePriorityChange = (value: string) => {
    setPriority(prev => 
      prev.includes(value) 
        ? prev.filter(p => p !== value)
        : [...prev, value]
    );
  };

  const activeFiltersCount = 
    (search ? 1 : 0) +
    status.length +
    priority.length +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (assignedTo ? 1 : 0);

  return (
    <div className="filter-bar">
      <div className="filter-bar-header">
        <div className="filter-search">
          <input
            type="text"
            placeholder="🔍 Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
          />
        </div>

        <button
          className="filter-toggle-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '▲' : '▼'} Filtros Avançados
          {activeFiltersCount > 0 && (
            <span className="filter-badge">{activeFiltersCount}</span>
          )}
        </button>

        <div className="filter-actions">
          <button className="filter-btn filter-btn-apply" onClick={handleApplyFilters}>
            Aplicar
          </button>
          {activeFiltersCount > 0 && (
            <button className="filter-btn filter-btn-clear" onClick={handleClearFilters}>
              Limpar
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="filter-bar-content">
          <div className="filter-row">
            {showStatus && (
              <div className="filter-group">
                <label>Status</label>
                <div className="filter-checkboxes">
                  {statusOptions.map(option => (
                    <label key={option.value} className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={status.includes(option.value)}
                        onChange={() => handleStatusChange(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {showPriority && (
              <div className="filter-group">
                <label>Prioridade</label>
                <div className="filter-checkboxes">
                  {priorityOptions.map(option => (
                    <label key={option.value} className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={priority.includes(option.value)}
                        onChange={() => handlePriorityChange(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {showDateRange && (
              <div className="filter-group">
                <label>Período</label>
                <div className="filter-date-range">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    placeholder="De"
                  />
                  <span>até</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    placeholder="Até"
                  />
                </div>
              </div>
            )}

            {showAssignee && assigneeOptions.length > 0 && (
              <div className="filter-group">
                <label>Atribuído a</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                >
                  <option value="">Todos</option>
                  {assigneeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {showCustomFilters}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
