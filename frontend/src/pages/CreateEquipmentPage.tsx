import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import '../styles/CreateEquipmentPage.css';
import { INSTITUTION_UNITS } from '../utils/institutionOptions';
import { BACKEND_URL } from '../services/api';

type EquipmentCategory = 'NOTEBOOK' | 'PERIPHERAL';

interface NotebookGroup {
  brand: string;
  model: string;
  count: number;
}

const CONDITION_OPTIONS = [
  { value: 'Novo',          label: 'Novo' },
  { value: 'Bom',           label: 'Bom' },
  { value: 'Regular',       label: 'Regular' },
  { value: 'Com Defeito',   label: 'Com Defeito' },
  { value: 'Para Descarte', label: 'Para Descarte' },
];

export default function CreateEquipmentPage() {
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState<EquipmentCategory>('NOTEBOOK');
  // step 1 = choose group (notebook only), step 2 = fill form
  const [step, setStep] = useState<1 | 2>(() => {
    return searchParams.get('brand') ? 2 : 1;
  });
  const [groups, setGroups] = useState<NotebookGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Básico
    type: '',
    custom_type: '',
    brand: searchParams.get('brand') || '',
    model: searchParams.get('model') || '',
    serial_number: '',
    
    // Notebook específico
    processor: '',
    ram: '',
    storage: '',
    screen_size: '',
    operating_system: '',
    
    // Localização e status
    current_unit: INSTITUTION_UNITS[0],
    current_status: 'available',
    physical_condition: 'Novo',
    
    // Aquisição
    acquisition_date: '',
    acquisition_value: '',
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const units = INSTITUTION_UNITS;

  // Fetch notebook groups for step 1
  useEffect(() => {
    if (category === 'NOTEBOOK' && step === 1) {
      fetchGroups();
    }
  }, [category, step]);

  const fetchGroups = async () => {
    try {
      setGroupsLoading(true);
      const token = localStorage.getItem('internal_token');
      const response = await fetch(`${BACKEND_URL}/api/inventory/notebooks`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      const notebooks: { brand: string; model: string }[] = data.notebooks || [];
      // Build groups with normalized keys
      const normalize = (s: string) => s.trim().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').toLowerCase();
      const map = new Map<string, NotebookGroup>();
      for (const nb of notebooks) {
        const raw = `${nb.brand} ${nb.model}`.trim().replace(/\s+/g, ' ');
        const key = normalize(raw);
        if (!map.has(key)) map.set(key, { brand: nb.brand.trim(), model: nb.model.trim(), count: 0 });
        map.get(key)!.count++;
      }
      setGroups(Array.from(map.values()).sort((a, b) => b.count - a.count));
    } catch { /* ignore */ } finally {
      setGroupsLoading(false);
    }
  };

  const selectGroup = (g: NotebookGroup) => {
    setFormData(prev => ({ ...prev, brand: g.brand, model: g.model }));
    setStep(2);
  };

  const peripheralTypes = [
    'Mouse',
    'Mousepad',
    'Teclado',
    'Monitor',
    'Webcam',
    'Fone de Ouvido',
    'Carregador',
    'Impressora',
    'Scanner',
    'Projetor',
    'Pen Drive',
    'HD Externo',
    'SSD Externo',
    'Adaptador',
    'Hub USB',
    'Switch',
    'Roteador',
    'Câmera',
    'Toner',
    'Cartucho de Tinta',
    'Outro (Especificar)'
  ];

  const handleCategoryChange = (newCategory: EquipmentCategory) => {
    setCategory(newCategory);
    setStep(1);
    // Reset campos não usados
    setFormData(prev => ({
      ...prev,
      brand: '',
      model: '',
      type: newCategory === 'NOTEBOOK' ? 'Notebook' : '',
      processor: '',
      ram: '',
      storage: '',
      screen_size: '',
      operating_system: ''
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validação
    if (!formData.brand || !formData.model) {
      setError('Marca e Modelo são obrigatórios');
      return;
    }

    if (category === 'PERIPHERAL' && !formData.type) {
      setError('Selecione o tipo de equipamento');
      return;
    }

    if (category === 'PERIPHERAL' && formData.type === 'Outro (Especificar)' && !formData.custom_type) {
      setError('Especifique o tipo do equipamento');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');

      // Preparar dados baseado na categoria
      const endpoint = category === 'NOTEBOOK' 
        ? '/api/inventory/notebooks'
        : '/api/inventory/peripherals';

      const payload = category === 'NOTEBOOK' ? {
        brand: formData.brand,
        model: formData.model,
        serial_number: formData.serial_number || 'S/N',
        processor: formData.processor,
        memory_ram: formData.ram,
        storage: formData.storage,
        screen_size: formData.screen_size,
        operating_system: formData.operating_system,
        current_unit: formData.current_unit,
        current_status: formData.current_status,
        physical_condition: formData.physical_condition,
        acquisition_date: formData.acquisition_date || null,
        purchase_value: formData.acquisition_value ? parseFloat(formData.acquisition_value) : null,
        notes: formData.notes
      } : {
        type: formData.type === 'Outro (Especificar)' ? formData.custom_type : formData.type,
        brand: formData.brand,
        model: formData.model,
        serial_number: formData.serial_number || 'S/N',
        current_unit: formData.current_unit,
        current_status: formData.current_status,
        physical_condition: formData.physical_condition,
        acquisition_date: formData.acquisition_date || null,
        purchase_value: formData.acquisition_value ? parseFloat(formData.acquisition_value) : null,
        notes: formData.notes
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar equipamento');
      }

      setSuccess(true);

      setTimeout(() => {
        navigate(category === 'NOTEBOOK' ? '/inventario/notebooks' : '/inventario/perifericos');
      }, 1500);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <InventoryLayout>
      <div className="create-equipment-page">
        <div className="container">
          <header className="page-header">
            <h1>➕ Novo Equipamento</h1>
            <p>Adicione um novo equipamento ao inventário</p>
          </header>

          {error && <div className="error-message">⚠️ {error}</div>}
          {success && <div className="success-message">✅ Equipamento criado com sucesso!</div>}

          {/* SELETOR DE CATEGORIA */}
          <div className="category-selector">
            <button
              type="button"
              className={`category-btn ${category === 'NOTEBOOK' ? 'active' : ''}`}
              onClick={() => handleCategoryChange('NOTEBOOK')}
            >
              <span className="category-icon">💻</span>
              <span className="category-label">Notebook</span>
              <span className="category-desc">Especificações técnicas detalhadas</span>
            </button>
            <button
              type="button"
              className={`category-btn ${category === 'PERIPHERAL' ? 'active' : ''}`}
              onClick={() => handleCategoryChange('PERIPHERAL')}
            >
              <span className="category-icon">🖱️</span>
              <span className="category-label">Periférico/Equipamento</span>
              <span className="category-desc">Mouse, teclado, impressora, monitor, toner, etc</span>
            </button>
          </div>

          <div className="form-container">

            {/* STEP 1 — ESCOLHER MODELO (apenas Notebook) */}
            {category === 'NOTEBOOK' && step === 1 && (
              <div className="group-picker">
                <div className="group-picker-title">Qual o modelo do notebook?</div>
                <p className="group-picker-subtitle">Escolha um modelo existente ou crie um novo.</p>

                {groupsLoading ? (
                  <div className="group-picker-loading">Carregando modelos...</div>
                ) : (
                  <div className="group-picker-list">
                    {groups.map(g => (
                      <button
                        key={`${g.brand}-${g.model}`}
                        type="button"
                        className="group-picker-item"
                        onClick={() => selectGroup(g)}
                      >
                        <span className="group-picker-icon">💻</span>
                        <span className="group-picker-name">{g.brand} {g.model}</span>
                        <span className="group-picker-count">{g.count} unidade{g.count !== 1 ? 's' : ''}</span>
                        <span className="group-picker-arrow">→</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      className="group-picker-item group-picker-new"
                      onClick={() => { setFormData(prev => ({ ...prev, brand: '', model: '' })); setStep(2); }}
                    >
                      <span className="group-picker-icon">＋</span>
                      <span className="group-picker-name">Criar novo modelo</span>
                      <span className="group-picker-count">Preencher marca e modelo manualmente</span>
                      <span className="group-picker-arrow">→</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2 — FORMULÁRIO */}
            {(category === 'PERIPHERAL' || step === 2) && (
            <form onSubmit={handleSubmit} className="create-form">
              {/* Breadcrumb de volta para grupos (notebook) */}
              {category === 'NOTEBOOK' && (
                <div className="group-back-bar">
                  <button type="button" className="group-back-btn" onClick={() => setStep(1)}>
                    ← Trocar modelo
                  </button>
                  <span className="group-back-label">
                    Adicionando a: <strong>{formData.brand || '—'} {formData.model || '—'}</strong>
                  </span>
                </div>
              )}

              {/* TIPO (só para periféricos) */}
              {category === 'PERIPHERAL' && (
                <>
                  <div className="form-group">
                    <label htmlFor="type">Tipo de Equipamento *</label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Selecione...</option>
                      {peripheralTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* TIPO CUSTOMIZADO */}
                  {formData.type === 'Outro (Especificar)' && (
                    <div className="form-group">
                      <label htmlFor="custom_type">Especifique o Tipo *</label>
                      <input
                        id="custom_type"
                        type="text"
                        name="custom_type"
                        placeholder="ex: Estabilizador, Nobreak, etc"
                        value={formData.custom_type}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {/* MARCA E MODELO */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="brand">Marca *</label>
                  <input
                    id="brand"
                    type="text"
                    name="brand"
                    placeholder="ex: Dell, Logitech"
                    value={formData.brand}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="model">Modelo *</label>
                  <input
                    id="model"
                    type="text"
                    name="model"
                    placeholder="ex: Inspiron 15, M170"
                    value={formData.model}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="serial_number">Número de Série</label>
                <input
                  id="serial_number"
                  type="text"
                  name="serial_number"
                  placeholder="S/N se não houver"
                  value={formData.serial_number}
                  onChange={handleInputChange}
                />
              </div>

              {/* CAMPOS ESPECÍFICOS DE NOTEBOOK */}
              {category === 'NOTEBOOK' && (
                <>
                  <div className="section-title">💻 Especificações Técnicas</div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="processor">Processador</label>
                      <input
                        id="processor"
                        type="text"
                        name="processor"
                        placeholder="ex: Intel i5 11ª Gen"
                        value={formData.processor}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="ram">Memória RAM</label>
                      <select
                        id="ram"
                        name="ram"
                        value={formData.ram}
                        onChange={handleInputChange}
                      >
                        <option value="">Selecione...</option>
                        <option value="4GB">4GB</option>
                        <option value="8GB">8GB</option>
                        <option value="16GB">16GB</option>
                        <option value="32GB">32GB</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="storage">Armazenamento</label>
                      <input
                        id="storage"
                        type="text"
                        name="storage"
                        placeholder="ex: SSD 256GB"
                        value={formData.storage}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="screen_size">Tamanho da Tela</label>
                      <select
                        id="screen_size"
                        name="screen_size"
                        value={formData.screen_size}
                        onChange={handleInputChange}
                      >
                        <option value="">Selecione...</option>
                        <option value="13&quot;">13"</option>
                        <option value="14&quot;">14"</option>
                        <option value="15.6&quot;">15.6"</option>
                        <option value="17&quot;">17"</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="operating_system">Sistema Operacional</label>
                    <input
                      id="operating_system"
                      type="text"
                      name="operating_system"
                      placeholder="ex: Windows 11"
                      value={formData.operating_system}
                      onChange={handleInputChange}
                    />
                  </div>
                </>
              )}

              {/* LOCALIZAÇÃO E STATUS */}
              <div className="section-title">📍 Localização e Estado</div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="current_unit">Unidade *</label>
                  <select
                    id="current_unit"
                    name="current_unit"
                    value={formData.current_unit}
                    onChange={handleInputChange}
                    required
                  >
                    {units.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="physical_condition">Estado Físico</label>
                  <select
                    id="physical_condition"
                    name="physical_condition"
                    value={formData.physical_condition}
                    onChange={handleInputChange}
                  >
                    {CONDITION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* AQUISIÇÃO */}
              <div className="section-title">💰 Informações de Compra</div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="acquisition_date">Data de Aquisição</label>
                  <input
                    id="acquisition_date"
                    type="date"
                    name="acquisition_date"
                    value={formData.acquisition_date}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="acquisition_value">Valor (R$)</label>
                  <input
                    id="acquisition_value"
                    type="number"
                    step="0.01"
                    name="acquisition_value"
                    placeholder="0.00"
                    value={formData.acquisition_value}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Observações</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="Informações adicionais, problemas conhecidos, etc."
                  value={formData.notes}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-submit"
                >
                  {loading ? '⏳ Criando...' : '✅ Criar Equipamento'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/inventario')}
                  className="btn-cancel"
                  disabled={loading}
                >
                  ❌ Cancelar
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      </div>
    </InventoryLayout>
  );
}
