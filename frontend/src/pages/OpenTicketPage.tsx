import { Fragment, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../utils/toast';
import '../styles/OpenTicketPage.css';
import { BACKEND_URL } from '../services/api';
import { INSTITUTION_UNITS } from '../utils/institutionOptions';
import { aiService, type ArticleSuggestion } from '../services/aiService';

interface FormData {
  email: string;
  name: string;
  department: string;
  unit: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  ticketDepartment: string; // 'ti' | 'administrativo' | 'rh'
  category: string;
  requestDetails: Record<string, any>;
}

interface RhPointAdjustment {
  date: string;
  correctedTime: string;
  notes: string;
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

const REQUESTER_STORAGE_KEY = 'opn_ticket_requester';

const TOTAL_STEPS = 5;
const STEPS = [
  { n: 1, label: 'Departamento' },
  { n: 2, label: 'Categoria' },
  { n: 3, label: 'Seus Dados' },
  { n: 4, label: 'Detalhes' },
  { n: 5, label: 'Confirmação' },
];

const DEPARTMENTS = [
  { value: 'ti', label: 'Suporte de TI', icon: '🖥️', desc: 'Problemas técnicos, acessos, instalação de software, equipamentos' },
  { value: 'administrativo', label: 'Administrativo', icon: '🏢', desc: 'Cópia de chave, apoio em evento, buscar doação, documentos' },
  { value: 'rh', label: 'Recursos Humanos', icon: '👥', desc: 'Atestado, ponto, folha de pagamento, benefícios, declarações' },
];

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

// RH public categories (confidential excluded from public form)
const RH_CATEGORIES = [
  { value: 'RH_ATESTADO', label: 'Atestado Médico', icon: '🏥' },
  { value: 'RH_PONTO', label: 'Ajuste de Ponto', icon: '⏰' },
  { value: 'RH_FOLHA', label: 'Folha de Pagamento', icon: '💰' },
  { value: 'RH_DECLARACAO', label: 'Declaração', icon: '📜' },
  { value: 'RH_BENEFICIOS', label: 'Benefícios', icon: '🎁' },
  { value: 'RH_OUTROS', label: 'Outros RH', icon: '📋' },
];

const ALL_CATEGORIES = [...TI_CATEGORIES, ...ADMIN_CATEGORIES, ...RH_CATEGORIES];

interface QuickAction {
  icon: string;
  label: string;
  hint: string;
  dept: string;
  cat: string;
  title: string;
  description: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: '🌐', label: 'Internet fora', hint: 'Sem conexão no computador', dept: 'ti', cat: 'internet', title: 'Internet sem conexão', description: 'Estou sem acesso à internet no meu computador.' },
  { icon: '🖨️', label: 'Impressora', hint: 'Não imprime ou está com erro', dept: 'ti', cat: 'impressora', title: 'Impressora com problema', description: 'A impressora não está funcionando corretamente.' },
  { icon: '🔑', label: 'Não consigo entrar', hint: 'Senha ou acesso bloqueado', dept: 'ti', cat: 'outro', title: 'Problema de acesso ao sistema', description: 'Não estou conseguindo acessar o sistema / minha senha está bloqueada.' },
  { icon: '💻', label: 'Computador lento', hint: 'Travando ou lento demais', dept: 'ti', cat: 'computador', title: 'Computador lento ou travando', description: 'Meu computador está muito lento e travando com frequência.' },
  { icon: '🗝️', label: 'Cópia de chave', hint: 'Solicitar chave de sala/armário', dept: 'administrativo', cat: 'copia_chave', title: 'Solicitar cópia de chave', description: 'Preciso de uma cópia de chave.' },
  { icon: '⏰', label: 'Ajuste de ponto', hint: 'Corrigir horário registrado', dept: 'rh', cat: 'RH_PONTO', title: 'Ajuste de ponto', description: '' },
];

export default function OpenTicketPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isReturningUser, setIsReturningUser] = useState(false);
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
    requestDetails: {},
  });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [articleSuggestions, setArticleSuggestions] = useState<ArticleSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load remembered requester (name/email/setor/unidade) from a previous visit
  useEffect(() => {
    try {
      const raw = localStorage.getItem(REQUESTER_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.email && saved?.name) {
          setFormData(prev => ({
            ...prev,
            email: saved.email || prev.email,
            name: saved.name || prev.name,
            department: saved.department || prev.department,
            unit: saved.unit || prev.unit,
          }));
          setIsReturningUser(true);
        }
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  // Automatic priority calculation — applies only to TI tickets
  const calculatePriority = (department: string, category: string, title: string, description: string): string => {
    if (department !== 'ti') return 'medium';

    const basePriority: Record<string, string> = {
      internet: 'high',
      sistema: 'high',
      computador: 'medium',
      impressora: 'low',
      outro: 'medium',
    };

    const levelMap: Record<string, number> = { low: 0, medium: 1, high: 2 };
    const levelNames = ['low', 'medium', 'high'];

    let level = levelMap[basePriority[category] ?? 'medium'];

    const text = `${title} ${description}`.toLowerCase();

    const urgentKeywords = ['urgente', 'urgência', 'parado', 'não funciona', 'nao funciona', 'caiu', 'bloqueado', 'impossível', 'impossivel', 'prazo', 'hoje', 'não consigo', 'nao consigo'];
    const calmKeywords = ['sem pressa', 'quando puder', 'futuramente', 'eventualmente'];

    const isUrgent = urgentKeywords.some(k => text.includes(k));
    const isCalm = calmKeywords.some(k => text.includes(k));

    if (isUrgent) level = Math.min(level + 1, 2);
    else if (isCalm) level = Math.max(level - 1, 0);

    return levelNames[level];
  };

  // Recalculate priority automatically whenever relevant fields change
  useEffect(() => {
    const newPriority = calculatePriority(
      formData.ticketDepartment,
      formData.category,
      formData.title,
      formData.description,
    );
    setFormData(prev => ({ ...prev, priority: newPriority }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.ticketDepartment, formData.category, formData.title, formData.description]);

  // Sugestão de artigos com debounce ao digitar a descrição
  useEffect(() => {
    const query = `${formData.title} ${formData.description}`.trim();
    if (query.length < 30) {
      setArticleSuggestions([]);
      return;
    }
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    suggestDebounceRef.current = setTimeout(async () => {
      setSuggestionsLoading(true);
      const suggestions = await aiService.suggestArticles(query);
      setArticleSuggestions(suggestions);
      setSuggestionsLoading(false);
    }, 800);
    return () => {
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.title, formData.description]);

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

  const createEmptyRhAdjustment = (): RhPointAdjustment => ({
    date: '',
    correctedTime: '',
    notes: '',
  });

  const getRhAdjustments = (details: Record<string, any>): RhPointAdjustment[] => {
    if (Array.isArray(details.adjustments) && details.adjustments.length > 0) {
      return details.adjustments.map((item: any) => ({
        date: String(item?.date ?? ''),
        correctedTime: String(item?.correctedTime ?? ''),
        notes: String(item?.notes ?? ''),
      }));
    }

    if (details.adjustmentDate || details.correctedTime || details.notes) {
      return [{
        date: String(details.adjustmentDate ?? ''),
        correctedTime: String(details.correctedTime ?? ''),
        notes: String(details.notes ?? ''),
      }];
    }

    return [createEmptyRhAdjustment()];
  };

  const normalizeRhPointRequestDetails = (details: Record<string, any>) => {
    const adjustments = getRhAdjustments(details)
      .map((item) => ({
        date: item.date.trim(),
        correctedTime: item.correctedTime.trim(),
        notes: item.notes.trim(),
      }))
      .filter((item) => item.date || item.correctedTime || item.notes);

    if (adjustments.length === 0) {
      return null;
    }

    const invalidAdjustment = adjustments.find((item) => !item.date || !item.correctedTime);
    if (invalidAdjustment) {
      return { error: 'Cada ajuste precisa de data e horário corretos.' };
    }

    return {
      ...details,
      adjustments,
      adjustmentDate: adjustments[0].date,
      correctedTime: adjustments[0].correctedTime,
    };
  };

  const updateRhAdjustment = (index: number, field: keyof RhPointAdjustment, value: string) => {
    setFormData((prev) => {
      const adjustments = getRhAdjustments(prev.requestDetails);
      const nextAdjustments = adjustments.map((item, currentIndex) => (
        currentIndex === index ? { ...item, [field]: value } : item
      ));

      return {
        ...prev,
        requestDetails: {
          ...prev.requestDetails,
          adjustments: nextAdjustments,
        },
      };
    });
  };

  const addRhAdjustment = () => {
    setFormData((prev) => {
      const adjustments = getRhAdjustments(prev.requestDetails);
      return {
        ...prev,
        requestDetails: {
          ...prev.requestDetails,
          adjustments: [...adjustments, createEmptyRhAdjustment()],
        },
      };
    });
  };

  const removeRhAdjustment = (index: number) => {
    setFormData((prev) => {
      const adjustments = getRhAdjustments(prev.requestDetails);
      const nextAdjustments = adjustments.filter((_, currentIndex) => currentIndex !== index);

      return {
        ...prev,
        requestDetails: {
          ...prev.requestDetails,
          adjustments: nextAdjustments.length > 0 ? nextAdjustments : [createEmptyRhAdjustment()],
        },
      };
    });
  };

  const handleRequestDetailChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      requestDetails: { ...prev.requestDetails, [field]: value },
    }));
  };

  // Check if current step is valid
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.ticketDepartment;
      case 2:
        return !!formData.category;
      case 3:
        return !!(formData.email && formData.name && !fieldErrors.email && !fieldErrors.name);
      case 4:
        return !!(formData.title && formData.description && !fieldErrors.title && !fieldErrors.description);
      case 5:
        return true;
      default:
        return false;
    }
  };

  // Navigate between steps — every jump scrolls back to the top so the
  // next question is always the first thing the user sees, never below the fold.
  const goToStep = (step: number) => {
    setCurrentStep(Math.min(Math.max(step, 1), TOTAL_STEPS));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasContactInfo = () => !!(formData.email && formData.name && !fieldErrors.email && !fieldErrors.name);

  const handleNextStep = () => {
    if (isStepValid(currentStep)) {
      goToStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    goToStep(currentStep - 1);
  };

  // A single tap fills department + category + a ready-to-send description
  // and skips straight past the questions the system can already answer.
  const handleQuickAction = (tmpl: QuickAction) => {
    setFormData(prev => ({
      ...prev,
      ticketDepartment: tmpl.dept,
      type: tmpl.dept === 'ti' ? 'incident' : 'request',
      category: tmpl.cat,
      title: tmpl.title,
      description: tmpl.description,
      requestDetails: tmpl.cat === 'RH_PONTO' ? { adjustments: [createEmptyRhAdjustment()] } : {},
    }));
    goToStep(hasContactInfo() ? 4 : 3);
  };

  const handleSelectDepartment = (dept: string) => {
    setFormData(prev => ({
      ...prev,
      ticketDepartment: dept,
      type: dept === 'ti' ? 'incident' : 'request',
      category: '',
      requestDetails: {},
    }));
    goToStep(2);
  };

  const handleSelectCategory = (catValue: string) => {
    setFormData(prev => ({
      ...prev,
      category: catValue,
      requestDetails: catValue === 'RH_PONTO' ? { adjustments: [createEmptyRhAdjustment()] } : {},
    }));
    goToStep(hasContactInfo() ? 4 : 3);
  };

  const activeCategories = formData.ticketDepartment === 'ti'
    ? TI_CATEGORIES
    : formData.ticketDepartment === 'administrativo'
      ? ADMIN_CATEGORIES
      : formData.ticketDepartment === 'rh'
        ? RH_CATEGORIES
        : [];

  const departmentMeta = DEPARTMENTS.find(d => d.value === formData.ticketDepartment);
  const categoryMeta = ALL_CATEGORIES.find(c => c.value === formData.category);

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

    const isRhPointRequest = formData.ticketDepartment === 'rh' && formData.category === 'RH_PONTO';
    let requestDetailsPayload = Object.keys(formData.requestDetails).length > 0 ? { ...formData.requestDetails } : undefined;

    if (isRhPointRequest) {
      const normalizedDetails = normalizeRhPointRequestDetails(formData.requestDetails);

      if (!normalizedDetails) {
        setError('Adicione pelo menos um ajuste de ponto.');
        showToast.error('Adicione pelo menos um ajuste de ponto.');
        setLoading(false);
        return;
      }

      if ('error' in normalizedDetails) {
        const errorMessage = normalizedDetails.error || 'Cada ajuste precisa de data e horário corretos.';
        setError(errorMessage);
        showToast.error(errorMessage);
        setLoading(false);
        return;
      }

      requestDetailsPayload = normalizedDetails;
    }

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
        throw new Error(errorData.error || 'Erro ao registrar usuário');
      }

      const { user_token } = await accessResponse.json();

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
          requestDetails: requestDetailsPayload,
          requester_name: formData.name,
        }),
      });

      if (!ticketResponse.ok) {
        const errorData = await ticketResponse.json().catch(() => ({}));
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

      // Remember the requester so the next visit can skip straight to the details step
      try {
        localStorage.setItem(REQUESTER_STORAGE_KEY, JSON.stringify({
          email: formData.email,
          name: formData.name,
          department: formData.department,
          unit: formData.unit,
        }));
      } catch {
        // ignore storage failures (private browsing, quota, etc.)
      }

      // Upload pending files (best-effort — ticket already created)
      if (pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          try {
            const fd = new FormData();
            fd.append('attachment', file);
            await fetch(`${BACKEND_URL}/api/tickets/${id}/attachments`, {
              method: 'POST',
              headers: { 'X-User-Token': user_token },
              body: fd,
            });
          } catch {
            // ignore individual upload failures
          }
        }
      }

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

  const SelectionTrail = () => {
    if (!departmentMeta) return null;
    return (
      <div className="selection-trail">
        <button type="button" className="trail-chip" onClick={() => goToStep(1)}>
          <span>{departmentMeta.icon}</span> {departmentMeta.label}
          <span className="trail-change">trocar</span>
        </button>
        {currentStep >= 3 && categoryMeta && (
          <button type="button" className="trail-chip" onClick={() => goToStep(2)}>
            <span>{categoryMeta.icon}</span> {categoryMeta.label}
            <span className="trail-change">trocar</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="open-ticket-page" data-dept={formData.ticketDepartment || 'ti'}>
      <span className="sr-only" aria-live="polite">
        {!successData ? `Etapa ${currentStep} de ${TOTAL_STEPS}: ${STEPS[currentStep - 1].label}` : 'Solicitação criada com sucesso'}
      </span>

      <div className={`open-ticket-layout ${successData ? 'single' : ''}`}>
        <div className="ticket-form-container">
          {!successData ? (
            <>
              {/* Stepper */}
              <div className="stepper">
                {STEPS.map((step, idx) => (
                  <Fragment key={step.n}>
                    <div className={`step ${currentStep >= step.n ? 'active' : ''} ${currentStep > step.n ? 'completed' : ''} ${currentStep === step.n ? 'current' : ''}`}>
                      <div className="step-circle">
                        {currentStep > step.n ? '✓' : step.n}
                      </div>
                      <div className="step-label">{step.label}</div>
                    </div>
                    {idx < STEPS.length - 1 && <div className="step-line"></div>}
                  </Fragment>
                ))}
              </div>

              <div className="form-header">
                <h1>Central de Solicitações</h1>
                <p>Conte o que você precisa — a gente te guia pelo resto</p>
              </div>

              {error && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleSubmit} className="ticket-form">
                {/* Step 1: Quick actions + Department */}
                {currentStep === 1 && (
                  <div className="form-step" data-step="1">
                    <div className="quick-actions-hero">
                      <span className="quick-actions-badge">⚡ Resposta rápida</span>
                      <h2>O que aconteceu?</h2>
                      <p className="section-subtitle">Toque em um problema comum e já preenchemos o resto para você</p>
                      <div className="quick-actions-grid">
                        {QUICK_ACTIONS.map(tmpl => (
                          <button
                            key={tmpl.label}
                            type="button"
                            className="quick-action-tile"
                            onClick={() => handleQuickAction(tmpl)}
                          >
                            <span className="qa-icon">{tmpl.icon}</span>
                            <span className="qa-label">{tmpl.label}</span>
                            <span className="qa-hint">{tmpl.hint}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="step-divider"><span>ou escolha manualmente</span></div>

                    <div className="step-card department-step-card">
                      <h3 className="section-title-sm">Selecione o departamento</h3>
                      <p className="section-subtitle">Sua solicitação vai direto para a equipe certa</p>

                      <div className="department-selection" role="radiogroup" aria-label="Tipo de Solicitação">
                        {DEPARTMENTS.map(dept => (
                          <button
                            key={dept.value}
                            type="button"
                            className={`department-card department-card--${dept.value} ${formData.ticketDepartment === dept.value ? 'active' : ''}`}
                            onClick={() => handleSelectDepartment(dept.value)}
                            role="radio"
                            aria-checked={formData.ticketDepartment === dept.value}
                          >
                            <span className="department-icon">{dept.icon}</span>
                            <span className="department-name">{dept.label}</span>
                            <span className="department-desc">{dept.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Category */}
                {currentStep === 2 && (
                  <div className="form-step" data-step="2">
                    <SelectionTrail />
                    <div className="step-card">
                      <h2 className="section-title">Qual é a categoria?</h2>
                      <p className="section-subtitle">Escolha a opção que mais se aproxima do seu caso</p>

                      <div className="type-chips" role="radiogroup" aria-label="Categoria">
                        {activeCategories.map((cat) => (
                          <button
                            key={cat.value}
                            type="button"
                            className={`chip ${formData.category === cat.value ? 'active' : ''}`}
                            onClick={() => handleSelectCategory(cat.value)}
                            role="radio"
                            aria-checked={formData.category === cat.value}
                          >
                            <span className="chip-icon">{cat.icon}</span>
                            <span className="chip-text">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="step-actions step-actions--single">
                      <button type="button" onClick={handlePrevStep} className="btn btn-secondary">
                        ← Voltar
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Personal Info */}
                {currentStep === 3 && (
                  <div className="form-step" data-step="3">
                    <SelectionTrail />
                    <div className="step-card">
                      <h2 className="section-title">Suas Informações</h2>
                      <p className="section-subtitle">Precisamos saber quem você é e onde trabalha</p>
                      {isReturningUser && (
                        <div className="returning-user-note">
                          👋 Preenchemos com seus dados do último chamado. Não é você? Edite os campos abaixo.
                        </div>
                      )}

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
                        disabled={!isStepValid(3)}
                      >
                        Continuar →
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Ticket Details */}
                {currentStep === 4 && (
                  <div className="form-step" data-step="4">
                    <SelectionTrail />
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

                        {/* Sugestões de artigos da KB */}
                        {(suggestionsLoading || articleSuggestions.length > 0) && (
                          <div className="kb-suggestions">
                            <div className="kb-suggestions-header">
                              <span className="kb-suggestions-icon">💡</span>
                              <span>Artigos que podem ajudar</span>
                              {suggestionsLoading && <span className="kb-suggestions-loading">buscando...</span>}
                            </div>
                            {articleSuggestions.map(article => (
                              <a
                                key={article.id}
                                href={`/central#${article.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="kb-suggestion-item"
                              >
                                <span className="kb-suggestion-category">{article.category}</span>
                                <span className="kb-suggestion-title">{article.title}</span>
                                <span className="kb-suggestion-arrow">→</span>
                              </a>
                            ))}
                            {articleSuggestions.length > 0 && (
                              <p className="kb-suggestions-footer">
                                Se um desses artigos resolver seu problema, não precisa abrir chamado.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* RH extra fields based on category */}
                      {formData.ticketDepartment === 'rh' && formData.category === 'RH_ATESTADO' && (
                        <div className="form-group">
                          <label htmlFor="medicalLeaveDays">
                            Dias de Afastamento <span className="required">*</span>
                          </label>
                          <input
                            id="medicalLeaveDays"
                            type="number"
                            min={1}
                            value={formData.requestDetails.medicalLeaveDays || ''}
                            onChange={e => handleRequestDetailChange('medicalLeaveDays', e.target.value)}
                            placeholder="Ex: 3"
                          />
                          <label htmlFor="adjustmentDateAtestado" style={{ marginTop: '0.75rem' }}>Data do Atestado</label>
                          <input
                            id="adjustmentDateAtestado"
                            type="date"
                            value={formData.requestDetails.adjustmentDate || ''}
                            onChange={e => handleRequestDetailChange('adjustmentDate', e.target.value)}
                          />
                          <label style={{ marginTop: '0.75rem' }}>Observações</label>
                          <textarea
                            value={formData.requestDetails.notes || ''}
                            onChange={e => handleRequestDetailChange('notes', e.target.value)}
                            placeholder="Informações adicionais..."
                            rows={2}
                          />
                        </div>
                      )}

                      {formData.ticketDepartment === 'rh' && formData.category === 'RH_PONTO' && (
                        <div className="form-group">
                          <div className="field-hint" style={{ marginBottom: '0.75rem' }}>
                            Adicione todas as datas do mês que precisam de correção no mesmo chamado.
                          </div>
                          {getRhAdjustments(formData.requestDetails).map((adjustment, index) => (
                            <div
                              key={index}
                              className="form-group rh-adjustment-card"
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                                <strong>Ajuste {index + 1}</strong>
                                {getRhAdjustments(formData.requestDetails).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeRhAdjustment(index)}
                                    className="rh-adjustment-remove"
                                  >
                                    Remover
                                  </button>
                                )}
                              </div>
                              <label htmlFor={`adjustmentDate-${index}`} style={{ marginTop: '0.75rem' }}>
                                Data do Ajuste <span className="required">*</span>
                              </label>
                              <input
                                id={`adjustmentDate-${index}`}
                                type="date"
                                value={adjustment.date}
                                onChange={e => updateRhAdjustment(index, 'date', e.target.value)}
                              />
                              <label htmlFor={`correctedTime-${index}`} style={{ marginTop: '0.75rem' }}>Horário Correto</label>
                              <input
                                id={`correctedTime-${index}`}
                                type="time"
                                value={adjustment.correctedTime}
                                onChange={e => updateRhAdjustment(index, 'correctedTime', e.target.value)}
                                placeholder="HH:MM"
                              />
                              <label htmlFor={`adjustmentNotes-${index}`} style={{ marginTop: '0.75rem' }}>Justificativa</label>
                              <textarea
                                id={`adjustmentNotes-${index}`}
                                value={adjustment.notes}
                                onChange={e => updateRhAdjustment(index, 'notes', e.target.value)}
                                placeholder="Explique o motivo deste ajuste..."
                                rows={2}
                              />
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addRhAdjustment}
                            className="btn btn-secondary"
                            style={{ marginTop: '0.25rem' }}
                          >
                            + Adicionar outra data
                          </button>
                        </div>
                      )}

                      {formData.ticketDepartment === 'rh' && formData.category === 'RH_FOLHA' && (
                        <div className="form-group">
                          <label htmlFor="payrollMonth">
                            Mês/Ano de Referência <span className="required">*</span>
                          </label>
                          <input
                            id="payrollMonth"
                            type="month"
                            value={formData.requestDetails.payrollMonth || ''}
                            onChange={e => handleRequestDetailChange('payrollMonth', e.target.value)}
                          />
                          <label style={{ marginTop: '0.75rem' }}>Observações</label>
                          <textarea
                            value={formData.requestDetails.notes || ''}
                            onChange={e => handleRequestDetailChange('notes', e.target.value)}
                            placeholder="Descreva a solicitação..."
                            rows={2}
                          />
                        </div>
                      )}

                      {formData.ticketDepartment === 'rh' && ['RH_DECLARACAO', 'RH_BENEFICIOS', 'RH_OUTROS'].includes(formData.category) && (
                        <div className="form-group">
                          <label>
                            Detalhes <span className="required">*</span>
                          </label>
                          <textarea
                            value={formData.requestDetails.notes || ''}
                            onChange={e => handleRequestDetailChange('notes', e.target.value)}
                            placeholder="Descreva o que você precisa..."
                            rows={3}
                          />
                        </div>
                      )}

                      {/* Attachments */}
                      <div className="form-group">
                        <label>Anexar Arquivos <span className="field-hint" style={{ fontWeight: 'normal' }}>(opcional)</span></label>
                        <div
                          className="file-drop-zone"
                          onClick={() => document.getElementById('open-ticket-file-input')?.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const dropped = Array.from(e.dataTransfer.files);
                            setPendingFiles((prev) => [...prev, ...dropped]);
                          }}
                        >
                          <span style={{ fontSize: '1.5rem' }}>📎</span>
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#555' }}>
                            Clique ou arraste arquivos aqui
                          </p>
                          <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: '#888' }}>
                            PDF, DOC, TXT, imagens, ZIP — máx. 10MB por arquivo
                          </p>
                          <input
                            id="open-ticket-file-input"
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.xls,.xlsx"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const selected = Array.from(e.target.files || []);
                              setPendingFiles((prev) => [...prev, ...selected]);
                              e.target.value = '';
                            }}
                          />
                        </div>
                        {pendingFiles.length > 0 && (
                          <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem', fontSize: '0.85rem' }}>
                            {pendingFiles.map((f, i) => (
                              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                📄 {f.name} ({(f.size / 1024).toFixed(0)} KB)
                                <button
                                  type="button"
                                  onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', fontWeight: 'bold' }}
                                >
                                  ✕
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
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
                        disabled={!isStepValid(4)}
                      >
                        Continuar →
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 5: Confirmation */}
                {currentStep === 5 && (
                  <div className="form-step" data-step="5">
                    <div className="step-card">
                      <h2 className="section-title">Confirmação</h2>
                      <p className="section-subtitle">Revise suas informações antes de enviar</p>

                      <div className="confirmation-summary">
                        <div className="summary-section">
                          <h3>Departamento</h3>
                          <div className="summary-item">
                            <span className="summary-label">Tipo de Solicitação:</span>
                            <span className="summary-value">
                              {departmentMeta && `${departmentMeta.icon} ${departmentMeta.label}`}
                            </span>
                          </div>
                          {categoryMeta && (
                            <div className="summary-item">
                              <span className="summary-label">Categoria:</span>
                              <span className="summary-value">
                                {categoryMeta.icon} {categoryMeta.label}
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
                          {formData.ticketDepartment === 'ti' && (
                            <div className="summary-item">
                              <span className="summary-label">Prioridade:</span>
                              <span className={`summary-value priority-badge priority-${formData.priority}`}>
                                {formData.priority === 'low' && '🟢 Baixa'}
                                {formData.priority === 'medium' && '🟡 Média'}
                                {formData.priority === 'high' && '🔴 Alta'}
                              </span>
                              <span className="priority-auto-note">Definida automaticamente pelo sistema</span>
                            </div>
                          )}
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
                  Sua solicitação foi registrada com sucesso. Nossa equipe irá analisá-la e entrar em contato.
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

        {!successData && (
          <aside className="otp-sidebar" aria-label="Resumo do chamado">
            <div className="otp-sidebar-card">
              <h4>Seu chamado</h4>
              <div className="otp-sidebar-row">
                <span className="otp-sidebar-label">Departamento</span>
                <span className={`otp-sidebar-value ${!departmentMeta ? 'muted' : ''}`}>
                  {departmentMeta ? `${departmentMeta.icon} ${departmentMeta.label}` : 'Ainda não escolhido'}
                </span>
              </div>
              <div className="otp-sidebar-row">
                <span className="otp-sidebar-label">Categoria</span>
                <span className={`otp-sidebar-value ${!categoryMeta ? 'muted' : ''}`}>
                  {categoryMeta ? `${categoryMeta.icon} ${categoryMeta.label}` : '—'}
                </span>
              </div>
              <div className="otp-sidebar-row">
                <span className="otp-sidebar-label">Problema</span>
                <span className={`otp-sidebar-value ${!formData.title ? 'muted' : ''}`}>
                  {formData.title || '—'}
                </span>
              </div>
              {formData.ticketDepartment === 'ti' && (
                <div className="otp-sidebar-row">
                  <span className="otp-sidebar-label">Prioridade</span>
                  <span className={`otp-sidebar-value priority-badge priority-${formData.priority}`}>
                    {formData.priority === 'low' && '🟢 Baixa'}
                    {formData.priority === 'medium' && '🟡 Média'}
                    {formData.priority === 'high' && '🔴 Alta'}
                  </span>
                </div>
              )}
              <div className="otp-sidebar-row">
                <span className="otp-sidebar-label">Solicitante</span>
                <span className={`otp-sidebar-value ${!formData.name ? 'muted' : ''}`}>
                  {formData.name || '—'}
                </span>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
