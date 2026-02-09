import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import '../styles/CreateEquipmentPage.css';

type EquipmentCategory = 'NOTEBOOK' | 'PERIPHERAL';

export default function CreateEquipmentPage() {
  const [category, setCategory] = useState<EquipmentCategory>('NOTEBOOK');
  const [formData, setFormData] = useState({
    // Básico
    type: '',
    custom_type: '',
    brand: '',
    model: '',
    serial_number: '',
    
    // Notebook específico
    processor: '',
    ram: '',
    storage: '',
    screen_size: '',
    operating_system: '',
    
    // Localização e status
    current_unit: 'Unidade Agapito',
    current_status: 'available',
    physical_condition: 'new',
    
    // Aquisição
    acquisition_date: '',
    acquisition_value: '',
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const units = [
    'Unidade Agapito',
    'Unidade Senador',
    'Unidade Caucaia',
    'Unidade Maracanau',
    'Unidade VP',
    'Unidade Maranguape'
  ];

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
    // Reset campos não usados
    setFormData(prev => ({
      ...prev,
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
            <form onSubmit={handleSubmit} className="create-form">
              
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
                    <option value="new">⭐ Novo</option>
                    <option value="good">✓ Bom</option>
                    <option value="regular">~ Regular</option>
                    <option value="bad">✗ Ruim</option>
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
          </div>
        </div>
      </div>
    </InventoryLayout>
  );
}
