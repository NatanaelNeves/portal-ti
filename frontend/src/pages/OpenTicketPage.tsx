import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../utils/toast';
import '../styles/OpenTicketPage.css';
import { BACKEND_URL } from '../services/api';
import { INSTITUTION_UNITS } from '../utils/institutionOptions';

interface FormData {
  email: string;
  name: string;
  department: string;
  unit: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  ticketDepartment: string; // 'ti' | 'administrativo'
  category: string;
}

interface FieldError {
  email?: string;
  name?: string;
  title?: string;
  description?: string;
}

interface SuccessData {
  ticketId: string;
  ticketCode: string;
  timestamp: Date;
  slaHours: number;
}

export default function OpenTicketPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    department: '',
    unit: '',
    title: '',
    description: '',
    type: 'incident',
    priority: 'medium',
    ticketDepartment: '', // Empty - user must choose
    category: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  // SLA mapping based on priority
  const getSlaHours = (priority: string): number => {
    const slaMap: Record<string, number> = {
      'high': 8,
      'medium': 24,
      'low': 72,
    };
    return slaMap[priority] || 24;
  };

  // Validation functions
  const validateEmail = (email: string): string | undefined => {
    if (!email) return 'Email é obrigatório';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Email inválido';
    return undefined;
  };

  const validateName = (name: string): string | undefined => {
    if (!name) return 'Nome é obrigatório';
    if (name.length < 3) return 'Nome deve ter no mínimo 3 caracteres';
    return undefined;
  };

  const validateTitle = (title: string): string | undefined => {
    if (!title) return 'Resumo é obrigatório';
    if (title.length < 5) return 'Resumo deve ter no mínimo 5 caracteres';
    if (title.length > 200) return 'Resumo deve ter no máximo 200 caracteres';
    return undefined;
  };

  const validateDescription = (description: string): string | undefined => {
    if (!description) return 'Descrição é obrigatória';
    if (description.length < 10) return 'Descrição deve ter no mínimo 10 caracteres';
    if (description.length > 2000) return 'Descrição deve ter no máximo 2000 caracteres';
    return undefined;
  };

  // Handle field change with live validation
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (fieldErrors[name as keyof FieldError]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Handle blur for validation
  const handleBlur = (field: keyof FieldError) => {
    let error: string | undefined;
    
    switch (field) {
      case 'email':
        error = validateEmail(formData.email);
        break;
      case 'name':
        error = validateName(formData.name);
        break;
      case 'title':
        error = validateTitle(formData.title);
        break;
      case 'description':
        error = validateDescription(formData.description);
        break;
    }
    
    if (error) {
      setFieldErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  // TI categories
  const TI_CATEGORIES = [
    { value: 'computador', label: 'Computador', icon: '💻' },
    { value: 'internet', label: 'Internet', icon: '🌐' },
    { value: 'impressora', label: 'Impressora', icon: '🖨️' },
    { value: 'sistema', label: 'Sistema', icon: '⚙️' },
    { value: 'outro', label: 'Outro', icon: '📋' },
  ];

  // Administrative categories
  const ADMIN_CATEGORIES = [
    { value: 'copia_chave', label: 'Cópia de chave', icon: '🔑' },
    { value: 'apoio_evento', label: 'Apoio em evento', icon: '🎪' },
    { value: 'buscar_doacao', label: 'Buscar doação', icon: '📦' },
    { value: 'solicitar_documento', label: 'Solicitar documento', icon: '📄' },
    { value: 'outro', label: 'Outro', icon: '📋' },
  ];

  // Check if current step is valid
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.ticketDepartment) return false;
        if (!formData.category) return false;
        return true;
      case 2:
        return !!(formData.email && formData.name && !fieldErrors.email && !fieldErrors.name);
      case 3:
        return !!(formData.title && formData.description && !fieldErrors.title && !fieldErrors.description);
      case 4:
        return true;
      default:
        return false;
    }
  };

  // Navigate between steps
  const handleNextStep = () => {
    if (isStepValid(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validação client-side
    if (formData.title.length < 5) {
      setError('Resumo deve ter no mínimo 5 caracteres');
      showToast.error('Resumo deve ter no mínimo 5 caracteres');
      setLoading(false);
      return;
    }

    if (formData.title.length > 200) {
      setError('Resumo deve ter no máximo 200 caracteres');
      showToast.error('Resumo deve ter no máximo 200 caracteres');
      setLoading(false);
      return;
    }

    if (formData.description.length < 10) {
      setError('Descrição deve ter no mínimo 10 caracteres');
      showToast.error('Descrição deve ter no mínimo 10 caracteres');
      setLoading(false);
      return;
    }

    if (formData.description.length > 2000) {
      setError('Descrição deve ter no máximo 2000 caracteres');
      showToast.error('Descrição deve ter no máximo 2000 caracteres');
      setLoading(false);
      return;
    }

    console.log('Iniciando criação de chamado...', {
      email: formData.email,
      name: formData.name,
      title: formData.title,
      type: formData.type,
      priority: formData.priority,
      descLength: formData.description.length
    });

    try {
      // First, get access token for public user
      const accessResponse = await fetch(`${BACKEND_URL}/api/public-auth/public-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          department: formData.department,
          unit: formData.unit,
        }),
      });

      if (!accessResponse.ok) {
        const errorData = await accessResponse.json().catch(() => ({}));
        console.error('Erro ao obter token:', errorData);
        throw new Error(errorData.error || 'Erro ao registrar usuário');
      }

      const { user_token } = await accessResponse.json();
      console.log('Token obtido com sucesso');

      // Create ticket
      const ticketResponse = await fetch(`${BACKEND_URL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Token': user_token,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          type: formData.type,
          priority: formData.priority,
          department: formData.ticketDepartment,
          category: formData.category || undefined,
        }),
      });

      if (!ticketResponse.ok) {
        const errorData = await ticketResponse.json().catch(() => ({}));
        console.error('Erro ao criar chamado:', errorData);
        let errorMessage = errorData.error || 'Erro ao criar chamado';
        if (Array.isArray(errorData.details) && errorData.details.length > 0) {
          errorMessage = errorData.details.map((d: any) => d.message).join('; ');
        } else if (typeof errorData.details === 'string') {
          errorMessage = errorData.details;
        }
        throw new Error(errorMessage);
      }

      const { id } = await ticketResponse.json();
      
      // Store tokens in localStorage for tracking
      localStorage.setItem('user_token', user_token);
      localStorage.setItem(`ticket_token_${id}`, user_token);
      localStorage.setItem(`ticket_email`, formData.email);
      
      const ticketCode = id.substring(0, 8).toUpperCase();
      const timestamp = new Date();
      const slaHours = getSlaHours(formData.priority);

      setSuccessData({
        ticketId: id,
        ticketCode,
        timestamp,
        slaHours,
      });

      showToast.success(`Chamado #${ticketCode} criado com sucesso!`);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar chamado');
      showToast.error(err.message || 'Erro ao criar chamado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="open-ticket-page">
      <div className="ticket-form-container">
        {!successData ? (
          <>
            {/* Stepper */}
            <div className="stepper">
              <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                <div className="step-circle">
                  {currentStep > 1 ? '✓' : '1'}
                </div>
                <div className="step-label">Departamento</div>
              </div>
              <div className="step-line"></div>
              <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                <div className="step-circle">
                  {currentStep > 2 ? '✓' : '2'}
                </div>
                <div className="step-label">Suas Informações</div>
              </div>
              <div className="step-line"></div>
              <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
                <div className="step-circle">
                  {currentStep > 3 ? '✓' : '3'}
                </div>
                <div className="step-label">Detalhes</div>
              </div>
              <div className="step-line"></div>
              <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>
                <div className="step-circle">4</div>
                <div className="step-label">Confirmação</div>
              </div>
            </div>

            <div className="form-header">
              <h1>Central de Solicitações</h1>
              <p>Abra uma solicitação para TI ou para o setor Administrativo</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit} className="ticket-form">
              {/* Step 1: Choose Department */}
              {currentStep === 1 && (
                <div className="form-step" data-step="1">
                  <div className="step-card">
                    <h2 className="section-title">Tipo de Solicitação</h2>
                    <p className="section-subtitle">Selecione para qual departamento é sua solicitação</p>
                    
                    <div className="department-selection" role="radiogroup" aria-label="Tipo de Solicitação">
                      <button
                        type="button"
                        className={`department-card ${formData.ticketDepartment === 'ti' ? 'active' : ''}`}
                        onClick={() => {
                          setFormData(prev => ({ 
                            ...prev, 
                            ticketDepartment: 'ti', 
                            type: 'incident',
                            category: '' 
                          }));
                        }}
                        role="radio"
                        aria-checked={formData.ticketDepartment === 'ti'}
                      >
                        <span className="department-icon">🖥️</span>
                        <span className="department-name">Suporte de TI</span>
                        <span className="department-desc">Problemas técnicos, acessos, instalação de software, equipamentos</span>
                      </button>
                      <button
                        type="button"
                        className={`department-card ${formData.ticketDepartment === 'administrativo' ? 'active' : ''}`}
                        onClick={() => {
                          setFormData(prev => ({ 
                            ...prev, 
                            ticketDepartment: 'administrativo', 
                            type: 'request',
                            category: '' 
                          }));
                        }}
                        role="radio"
                        aria-checked={formData.ticketDepartment === 'administrativo'}
                      >
                        <span className="department-icon">🏢</span>
                        <span className="department-name">Solicitação Administrativa</span>
                        <span className="department-desc">Cópia de chave, apoio em evento, buscar doação, documentos</span>
                      </button>
                    </div>

                    {/* TI categories */}
                    {formData.ticketDepartment === 'ti' && (
                      <div className="form-group" style={{ marginTop: '1.5rem' }}>
                        <label>
                          Categoria <span className="required">*</span>
                        </label>
                        <div className="type-chips" role="radiogroup" aria-label="Categoria de TI">
                          {TI_CATEGORIES.map((cat) => (
                            <button
                              key={cat.value}
                              type="button"
                              className={`chip ${formData.category === cat.value ? 'active' : ''}`}
                              onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                              role="radio"
                              aria-checked={formData.category === cat.value}
                            >
                              <span className="chip-icon">{cat.icon}</span>
                              <span className="chip-text">{cat.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Admin categories */}
                    {formData.ticketDepartment === 'administrativo' && (
                      <div className="form-group" style={{ marginTop: '1.5rem' }}>
                        <label>
                          Categoria <span className="required">*</span>
                        </label>
                        <div className="type-chips" role="radiogroup" aria-label="Categoria Administrativa">
                          {ADMIN_CATEGORIES.map((cat) => (
                            <button
                              key={cat.value}
                              type="button"
                              className={`chip ${formData.category === cat.value ? 'active' : ''}`}
                              onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                              role="radio"
                              aria-checked={formData.category === cat.value}
                            >
                              <span className="chip-icon">{cat.icon}</span>
                              <span className="chip-text">{cat.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="step-actions">
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="btn btn-primary"
                      disabled={!formData.ticketDepartment || !formData.category}
                    >
                      Continuar →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Personal Info */}
              {currentStep === 2 && (
                <div className="form-step" data-step="2">
                  <div className="step-card">
                    <h2 className="section-title">Suas Informações</h2>
                    <p className="section-subtitle">Precisamos saber quem você é e onde trabalha</p>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="email">
                          Email <span className="required">*</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          onBlur={() => handleBlur('email')}
                          required
                          placeholder="seu@email.com"
                          className={fieldErrors.email ? 'input-error' : ''}
                          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                        />
                        {fieldErrors.email && (
                          <span id="email-error" className="error-message" role="alert">
                            {fieldErrors.email}
                          </span>
                        )}
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="name">
                          Nome Completo <span className="required">*</span>
                        </label>
                        <input
                          id="name"
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          onBlur={() => handleBlur('name')}
                          required
                          placeholder="Seu Nome"
                          className={fieldErrors.name ? 'input-error' : ''}
                          aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                        />
                        {fieldErrors.name && (
                          <span id="name-error" className="error-message" role="alert">
                            {fieldErrors.name}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="department">Setor</label>
                        <input
                          id="department"
                          type="text"
                          name="department"
                          value={formData.department}
                          onChange={handleChange}
                          placeholder="Ex: Educação Social, Acolhimento, Administrativo"
                        />
                        <span className="field-hint">Digite seu setor ou área de atuação</span>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="unit">Unidade</label>
                        <select
                          id="unit"
                          name="unit"
                          value={formData.unit}
                          onChange={handleChange}
                        >
                          <option value="">Selecione a unidade (opcional)</option>
                          {INSTITUTION_UNITS.map((unit) => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                        <span className="field-hint">Unidades oficiais do O Pequeno Nazareno</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="step-actions">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="btn btn-secondary"
                    >
                      ← Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="btn btn-primary"
                      disabled={!isStepValid(2)}
                    >
                      Continuar →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Ticket Details */}
              {currentStep === 3 && (
                <div className="form-step" data-step="3">
                  <div className="step-card">
                    <h2 className="section-title">Detalhes da Solicitação</h2>
                    <p className="section-subtitle">Descreva o que você precisa</p>
                    
                    <div className="form-group">
                      <label htmlFor="title">
                        Resumo <span className="required">*</span>
                      </label>
                      <input
                        id="title"
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        onBlur={() => handleBlur('title')}
                        required
                        placeholder="Ex: Impressora do setor não imprime"
                        maxLength={200}
                        className={fieldErrors.title ? 'input-error' : ''}
                        aria-describedby="title-hint title-error"
                      />
                      <span id="title-hint" className="field-hint">
                        Seja objetivo. Descreva o problema em uma frase curta
                      </span>
                      {fieldErrors.title && (
                        <span id="title-error" className="error-message" role="alert">
                          {fieldErrors.title}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="description">
                        Descrição Completa <span className="required">*</span>
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        onBlur={() => handleBlur('description')}
                        required
                        placeholder="Descreva em detalhes o que está acontecendo e como isso impacta seu trabalho..."
                        rows={6}
                        maxLength={2000}
                        className={fieldErrors.description ? 'input-error' : ''}
                        aria-describedby="description-hint description-error"
                      />
                      <span id="description-hint" className="field-hint">
                        Quanto mais detalhes, mais rápido conseguiremos ajudar
                      </span>
                      {fieldErrors.description && (
                        <span id="description-error" className="error-message" role="alert">
                          {fieldErrors.description}
                        </span>
                      )}
                    </div>

                    {/* Type is auto-set based on department; categories are selected in Step 1 */}

                    {/* Priority as Visual Scale */}
                    <div className="form-group">
                      <label>
                        Impacto no Atendimento <span className="required">*</span>
                      </label>
                      <div className="priority-scale" role="radiogroup" aria-label="Impacto no Atendimento">
                        <button
                          type="button"
                          className={`priority-option priority-low ${formData.priority === 'low' ? 'active' : ''}`}
                          onClick={() => setFormData(prev => ({ ...prev, priority: 'low' }))}
                          role="radio"
                          aria-checked={formData.priority === 'low'}
                        >
                          <div className="priority-indicator"></div>
                          <div className="priority-label">Baixo</div>
                          <div className="priority-desc">Pode esperar alguns dias</div>
                        </button>
                        <button
                          type="button"
                          className={`priority-option priority-medium ${formData.priority === 'medium' ? 'active' : ''}`}
                          onClick={() => setFormData(prev => ({ ...prev, priority: 'medium' }))}
                          role="radio"
                          aria-checked={formData.priority === 'medium'}
                        >
                          <div className="priority-indicator"></div>
                          <div className="priority-label">Médio</div>
                          <div className="priority-desc">Afeta minhas atividades</div>
                        </button>
                        <button
                          type="button"
                          className={`priority-option priority-high ${formData.priority === 'high' ? 'active' : ''}`}
                          onClick={() => setFormData(prev => ({ ...prev, priority: 'high' }))}
                          role="radio"
                          aria-checked={formData.priority === 'high'}
                        >
                          <div className="priority-indicator"></div>
                          <div className="priority-label">Alto</div>
                          <div className="priority-desc">Dificulta muito o trabalho</div>
                        </button>

                      </div>
                      <span className="field-hint">
                        Selecione o nível que melhor representa o impacto no seu trabalho
                      </span>
                    </div>
                  </div>
                  
                  <div className="step-actions">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="btn btn-secondary"
                    >
                      ← Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="btn btn-primary"
                      disabled={!isStepValid(3)}
                    >
                      Continuar →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Confirmation */}
              {currentStep === 4 && (
                <div className="form-step" data-step="4">
                  <div className="step-card">
                    <h2 className="section-title">Confirmação</h2>
                    <p className="section-subtitle">Revise suas informações antes de enviar</p>
                    
                    <div className="confirmation-summary">
                      <div className="summary-section">
                        <h3>Departamento</h3>
                        <div className="summary-item">
                          <span className="summary-label">Tipo de Solicitação:</span>
                          <span className="summary-value">
                            {formData.ticketDepartment === 'ti' ? '🖥️ Suporte de TI' : '🏢 Solicitação Administrativa'}
                          </span>
                        </div>
                        {formData.category && (
                          <div className="summary-item">
                            <span className="summary-label">Categoria:</span>
                            <span className="summary-value">
                              {[...TI_CATEGORIES, ...ADMIN_CATEGORIES].find(c => c.value === formData.category)?.icon}{' '}
                              {[...TI_CATEGORIES, ...ADMIN_CATEGORIES].find(c => c.value === formData.category)?.label}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="summary-section">
                        <h3>Seus Dados</h3>
                        <div className="summary-item">
                          <span className="summary-label">Nome:</span>
                          <span className="summary-value">{formData.name}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Email:</span>
                          <span className="summary-value">{formData.email}</span>
                        </div>
                        {formData.department && (
                          <div className="summary-item">
                            <span className="summary-label">Setor:</span>
                            <span className="summary-value">{formData.department}</span>
                          </div>
                        )}
                        {formData.unit && (
                          <div className="summary-item">
                            <span className="summary-label">Unidade:</span>
                            <span className="summary-value">{formData.unit}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="summary-section">
                        <h3>Solicitação</h3>
                        <div className="summary-item">
                          <span className="summary-label">Resumo:</span>
                          <span className="summary-value">{formData.title}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Descrição:</span>
                          <span className="summary-value">{formData.description}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Impacto:</span>
                          <span className={`summary-value priority-badge priority-${formData.priority}`}>
                            {formData.priority === 'low' && 'Baixo'}
                            {formData.priority === 'medium' && 'Médio'}
                            {formData.priority === 'high' && 'Alto'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="step-actions">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="btn btn-secondary"
                    >
                      ← Voltar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-submit"
                      disabled={loading}
                    >
                      {loading ? 'Enviando...' : '✓ Solicitar Apoio'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </>
        ) : (
          /* Success Screen */
          <div className="success-screen">
            <div className="success-icon-animated">
              <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
            </div>
            
            <h2 className="success-title">Solicitação Criada com Sucesso!</h2>
            
            <div className="protocol-card">
              <div className="protocol-number">
                <span className="protocol-label">Número do Protocolo</span>
                <span className="protocol-value">{successData.ticketCode}</span>
              </div>
              
              <div className="protocol-details">
                <div className="detail-item">
                  <span className="detail-icon">📅</span>
                  <div className="detail-content">
                    <span className="detail-label">Data/Hora</span>
                    <span className="detail-value">
                      {successData.timestamp.toLocaleDateString('pt-BR')} às {successData.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                
                <div className="detail-item">
                  <span className="detail-icon">⏱️</span>
                  <div className="detail-content">
                    <span className="detail-label">SLA Estimado</span>
                    <span className="detail-value">{successData.slaHours}h</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="success-message-box">
              <p className="success-message">
                ✉️ Você receberá um e-mail de confirmação em <strong>{formData.email}</strong>
              </p>
              <p className="success-hint">
                Guarde o número do protocolo para acompanhar sua solicitação
              </p>
            </div>
            
            <div className="success-actions">
              <button
                onClick={() => navigate(`/chamado/${successData.ticketId}`)}
                className="btn btn-primary"
              >
                Ver Detalhes do Chamado
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-secondary"
              >
                ➕ Abrir Novo Chamado
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
