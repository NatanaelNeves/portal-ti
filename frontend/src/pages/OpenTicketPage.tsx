import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { showToast } from '../utils/toast';
import '../styles/OpenTicketPage.css';
import { BACKEND_URL } from '../services/api';
import { INSTITUTION_DEPARTMENTS, INSTITUTION_UNITS } from '../utils/institutionOptions';
import { findShortcut, TICKET_SHORTCUTS, type TicketShortcut } from '../utils/ticketShortcuts';
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
  { n: 1, label: 'Equipe', title: 'Abrir um chamado', lead: 'Escolha um problema comum ou a equipe que pode ajudar.' },
  { n: 2, label: 'Assunto', title: 'Qual é o assunto?', lead: 'Escolha a opção mais próxima do seu caso.' },
  { n: 3, label: 'Seus dados', title: 'Quem está pedindo?', lead: 'Usamos esses dados para dar retorno sobre o chamado.' },
  { n: 4, label: 'Detalhes', title: 'Conte o que está acontecendo', lead: 'Quanto mais claro, mais rápido a equipe consegue ajudar.' },
  { n: 5, label: 'Revisão', title: 'Revise antes de enviar', lead: 'Confira se está tudo certo. Você pode alterar qualquer parte.' },
];

const DEPARTMENTS = [
  { value: 'ti', label: 'Suporte de TI', icon: 'ti-device-laptop', desc: 'Computador, internet, acessos, impressora e sistemas' },
  { value: 'administrativo', label: 'Administrativo', icon: 'ti-building', desc: 'Cópia de chave, apoio em evento, doações e documentos' },
  { value: 'rh', label: 'Recursos Humanos', icon: 'ti-users', desc: 'Atestado, ponto, folha de pagamento, benefícios e declarações' },
];

// TI categories
const TI_CATEGORIES = [
  { value: 'computador', label: 'Computador', icon: 'ti-device-desktop' },
  { value: 'internet', label: 'Internet', icon: 'ti-wifi' },
  { value: 'impressora', label: 'Impressora', icon: 'ti-printer' },
  { value: 'sistema', label: 'Sistema', icon: 'ti-apps' },
  { value: 'outro', label: 'Outro assunto', icon: 'ti-dots' },
];

// Administrative categories
const ADMIN_CATEGORIES = [
  { value: 'copia_chave', label: 'Cópia de chave', icon: 'ti-key' },
  { value: 'apoio_evento', label: 'Apoio em evento', icon: 'ti-calendar-event' },
  { value: 'buscar_doacao', label: 'Buscar doação', icon: 'ti-package' },
  { value: 'solicitar_documento', label: 'Solicitar documento', icon: 'ti-file-text' },
  { value: 'outro', label: 'Outro assunto', icon: 'ti-dots' },
];

// RH public categories (confidential excluded from public form)
const RH_CATEGORIES = [
  { value: 'RH_ATESTADO', label: 'Atestado médico', icon: 'ti-stethoscope' },
  { value: 'RH_PONTO', label: 'Ajuste de ponto', icon: 'ti-clock-edit' },
  { value: 'RH_FOLHA', label: 'Folha de pagamento', icon: 'ti-cash' },
  { value: 'RH_DECLARACAO', label: 'Declaração', icon: 'ti-file-certificate' },
  { value: 'RH_BENEFICIOS', label: 'Benefícios', icon: 'ti-gift' },
  { value: 'RH_OUTROS', label: 'Outro assunto', icon: 'ti-dots' },
];

const ALL_CATEGORIES = [...TI_CATEGORIES, ...ADMIN_CATEGORIES, ...RH_CATEGORIES];

const PRIORITY_LABEL: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' };

const hasStoredRequester = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(REQUESTER_STORAGE_KEY) || 'null');
    return !!(saved?.email && saved?.name);
  } catch {
    return false;
  }
};

export default function OpenTicketPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [stepDirection, setStepDirection] = useState<'forward' | 'back'>('forward');
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
    const next = Math.min(Math.max(step, 1), TOTAL_STEPS);
    setStepDirection(next >= currentStep ? 'forward' : 'back');
    setCurrentStep(next);
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
  const handleQuickAction = (tmpl: TicketShortcut, knownRequester = hasContactInfo()) => {
    setFormData(prev => ({
      ...prev,
      ticketDepartment: tmpl.dept,
      type: tmpl.dept === 'ti' ? 'incident' : 'request',
      category: tmpl.cat,
      title: tmpl.title,
      description: tmpl.description,
      requestDetails: tmpl.cat === 'RH_PONTO' ? { adjustments: [createEmptyRhAdjustment()] } : {},
    }));
    goToStep(knownRequester ? 4 : 3);
  };

  // Atalho vindo da página inicial (`/abrir-chamado?atalho=internet`).
  // Lê o solicitante direto do armazenamento: o estado ainda não foi
  // atualizado pelo efeito que o carrega.
  useEffect(() => {
    const shortcut = findShortcut(searchParams.get('atalho'));
    if (!shortcut) return;
    handleQuickAction(shortcut, hasStoredRequester());
    setSearchParams({}, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    } catch (err: any) {
      // `fetch` rejeita com TypeError quando não há conexão com o servidor.
      const message = err instanceof TypeError
        ? 'Sem conexão com o portal. Seu chamado não foi enviado; confira a internet e toque em Enviar de novo.'
        : err.message || 'Não foi possível enviar o chamado. Tente de novo.';
      setError(message);
      showToast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const stepMeta = STEPS[currentStep - 1];
  const rhAdjustments = getRhAdjustments(formData.requestDetails);

  const renderError = (id: string, message?: string) => message && (
    <span id={id} className="pub-field__error" role="alert">
      <i className="ti ti-alert-circle" aria-hidden="true" />
      {message}
    </span>
  );

  const SelectionTrail = () => {
    if (!departmentMeta) return null;
    return (
      <div className="otp-trail">
        <button type="button" className="otp-trail__chip" onClick={() => goToStep(1)}>
          <i className={`ti ${departmentMeta.icon}`} aria-hidden="true" />
          {departmentMeta.label}
          <span className="pub-sr-only">(alterar equipe)</span>
        </button>
        {currentStep >= 3 && categoryMeta && (
          <button type="button" className="otp-trail__chip" onClick={() => goToStep(2)}>
            <i className={`ti ${categoryMeta.icon}`} aria-hidden="true" />
            {categoryMeta.label}
            <span className="pub-sr-only">(alterar assunto)</span>
          </button>
        )}
      </div>
    );
  };

  if (successData) {
    return (
      <div className="pub-page otp" data-dept={formData.ticketDepartment || 'ti'}>
        <span className="pub-sr-only" aria-live="polite">Chamado enviado</span>
        <div className="otp-done-glow pub-aurora" aria-hidden="true" />
        <div className="pub-wrap otp-done">
          <h1 className="otp-done__title">Chamado enviado</h1>
          <p className="otp-done__lead">
            A equipe de {departmentMeta?.label ?? 'atendimento'} já recebeu seu pedido.
            Você acompanha cada etapa em Meus chamados.
          </p>

          <div className="otp-stub">
            <div className="otp-stub__main">
              <span className="otp-stub__label">Protocolo</span>
              <strong className="otp-stub__code">{successData.ticketCode}</strong>
              <span className="otp-stub__title">{formData.title}</span>
            </div>
            <dl className="otp-stub__meta">
              <div>
                <dt>Enviado</dt>
                <dd>
                  {successData.timestamp.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às{' '}
                  {successData.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </dd>
              </div>
              <div>
                <dt>Meta de atendimento</dt>
                <dd>até {successData.slaHours}h</dd>
              </div>
            </dl>
          </div>

          <p className="otp-done__hint">
            Guarde o protocolo. Com ele e o seu e-mail você encontra o chamado de qualquer aparelho.
          </p>

          <div className="otp-done__actions">
            <button
              type="button"
              className="pub-btn pub-btn--primary pub-btn--block"
              onClick={() => navigate(`/chamado/${successData.ticketId}`)}
            >
              Acompanhar este chamado
            </button>
            <button
              type="button"
              className="pub-btn pub-btn--ghost pub-btn--block"
              onClick={() => window.location.reload()}
            >
              Abrir outro chamado
            </button>
          </div>
        </div>
      </div>
    );
  }

  const showActionBar = currentStep >= 3;

  return (
    <div className="pub-page otp" data-dept={formData.ticketDepartment || 'ti'}>
      <span className="pub-sr-only" aria-live="polite">
        {`Etapa ${currentStep} de ${TOTAL_STEPS}: ${stepMeta.label}`}
      </span>

      <section className="otp-hero pub-aurora">
        <div className="pub-wrap otp-hero__inner">
          <div className="otp-progress">
            {currentStep > 1 ? (
              <button type="button" className="otp-back" onClick={handlePrevStep}>
                <i className="ti ti-arrow-left" aria-hidden="true" />
                Voltar
              </button>
            ) : <span />}
            <span className="otp-progress__count">Etapa {currentStep} de {TOTAL_STEPS}</span>
          </div>
          <ol
            className="otp-steps"
            role="progressbar"
            aria-label="Progresso do chamado"
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-valuenow={currentStep}
          >
            {STEPS.map((step) => (
              <li
                key={step.n}
                className={step.n < currentStep ? 'is-done' : step.n === currentStep ? 'is-current' : ''}
              >
                <span className="otp-steps__bar" />
                <span className="otp-steps__label">{step.label}</span>
              </li>
            ))}
          </ol>
          <div key={currentStep} className={`otp-hero__title otp-anim--${stepDirection}`}>
            <h1>{stepMeta.title}</h1>
            <p>{stepMeta.lead}</p>
          </div>
        </div>
      </section>

      <div className="pub-wrap otp-layout">
        <div className="otp-main">

          {error && (
            <div className="pub-alert otp-alert" role="alert">
              <i className="ti ti-alert-circle" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={`otp-form otp-anim-scope--${stepDirection} ${showActionBar ? 'has-bar' : ''}`} noValidate>
            {/* Step 1: Quick actions + Department */}
            {currentStep === 1 && (
              <div className="otp-step" data-step="1">
                <h2 className="otp-subhead">Problemas comuns</h2>
                <ul className="pub-tiles">
                  {TICKET_SHORTCUTS.map(tmpl => (
                    <li key={tmpl.id}>
                      <button type="button" className="pub-tile" onClick={() => handleQuickAction(tmpl)}>
                        <span className={`pub-gicon pub-gicon--${tmpl.dept}`} aria-hidden="true">
                          <i className={`ti ${tmpl.icon}`} />
                        </span>
                        <span className="pub-tile__copy">
                          <strong>{tmpl.label}</strong>
                          <span>{tmpl.hint}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                <h2 className="otp-subhead">Ou escolha a equipe</h2>
                <ul className="otp-teams" role="radiogroup" aria-label="Equipe responsável">
                  {DEPARTMENTS.map(dept => (
                    <li key={dept.value}>
                      <button
                        type="button"
                        className={`otp-team otp-team--${dept.value}`}
                        onClick={() => handleSelectDepartment(dept.value)}
                        role="radio"
                        aria-checked={formData.ticketDepartment === dept.value}
                      >
                        <span className={`pub-gicon pub-gicon--${dept.value}`} aria-hidden="true">
                          <i className={`ti ${dept.icon}`} />
                        </span>
                        <span className="otp-team__copy">
                          <strong>{dept.label}</strong>
                          <span>{dept.desc}</span>
                        </span>
                        <i className="ti ti-arrow-right otp-team__go" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Step 2: Category */}
            {currentStep === 2 && (
              <div className="otp-step" data-step="2">
                <SelectionTrail />
                <ul className="pub-tiles otp-cats" role="radiogroup" aria-label="Assunto">
                  {activeCategories.map((cat) => (
                    <li key={cat.value}>
                      <button
                        type="button"
                        className={`pub-tile ${formData.category === cat.value ? 'is-selected' : ''}`}
                        onClick={() => handleSelectCategory(cat.value)}
                        role="radio"
                        aria-checked={formData.category === cat.value}
                      >
                        <span className={`pub-gicon pub-gicon--${formData.ticketDepartment}`} aria-hidden="true">
                          <i className={`ti ${cat.icon}`} />
                        </span>
                        <span className="pub-tile__copy">
                          <strong>{cat.label}</strong>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Step 3: Personal Info */}
            {currentStep === 3 && (
              <div className="otp-step" data-step="3">
                <SelectionTrail />
                {isReturningUser && (
                  <p className="otp-note">
                    <i className="ti ti-user-check" aria-hidden="true" />
                    Preenchemos com os dados do seu último chamado. Se não for você, é só editar.
                  </p>
                )}

                <div className="otp-panel">
                  <div className="pub-field">
                    <label htmlFor="name">Nome completo</label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      onBlur={() => handleBlur('name')}
                      required
                      autoComplete="name"
                      autoCapitalize="words"
                      placeholder="Como você se chama"
                      className={fieldErrors.name ? 'is-invalid' : ''}
                      aria-invalid={!!fieldErrors.name}
                      aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                    />
                    {renderError('name-error', fieldErrors.name)}
                  </div>

                  <div className="pub-field">
                    <label htmlFor="email">E-mail</label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={() => handleBlur('email')}
                      required
                      autoComplete="email"
                      inputMode="email"
                      autoCapitalize="off"
                      placeholder="nome@exemplo.com"
                      className={fieldErrors.email ? 'is-invalid' : ''}
                      aria-invalid={!!fieldErrors.email}
                      aria-describedby={fieldErrors.email ? 'email-error' : 'email-hint'}
                    />
                    {fieldErrors.email
                      ? renderError('email-error', fieldErrors.email)
                      : <span id="email-hint" className="pub-field__hint">As atualizações do chamado chegam neste e-mail.</span>}
                  </div>

                  <div className="pub-field">
                    <label htmlFor="department">
                      Setor <span className="pub-field__optional">(opcional)</span>
                    </label>
                    <input
                      id="department"
                      type="text"
                      name="department"
                      list="otp-department-options"
                      value={formData.department}
                      onChange={handleChange}
                      placeholder="Ex.: Acolhimento Institucional"
                    />
                    <datalist id="otp-department-options">
                      {INSTITUTION_DEPARTMENTS.map((dept) => <option key={dept} value={dept} />)}
                    </datalist>
                  </div>

                  <div className="pub-field">
                    <label htmlFor="unit">
                      Unidade <span className="pub-field__optional">(opcional)</span>
                    </label>
                    <select id="unit" name="unit" value={formData.unit} onChange={handleChange}>
                      <option value="">Selecione a unidade</option>
                      {INSTITUTION_UNITS.map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Ticket Details */}
            {currentStep === 4 && (
              <div className="otp-step" data-step="4">
                <SelectionTrail />
                <div className="otp-panel">
                  <div className="pub-field">
                    <label htmlFor="title">Resumo</label>
                    <input
                      id="title"
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      onBlur={() => handleBlur('title')}
                      required
                      placeholder="Ex.: Impressora da sala 2 não imprime"
                      maxLength={200}
                      className={fieldErrors.title ? 'is-invalid' : ''}
                      aria-invalid={!!fieldErrors.title}
                      aria-describedby={fieldErrors.title ? 'title-error' : 'title-hint'}
                    />
                    {fieldErrors.title
                      ? renderError('title-error', fieldErrors.title)
                      : <span id="title-hint" className="pub-field__hint">Uma frase curta sobre o problema.</span>}
                  </div>

                  <div className="pub-field">
                    <label htmlFor="description">O que está acontecendo</label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      onBlur={() => handleBlur('description')}
                      required
                      placeholder="Desde quando acontece, o que você já tentou e como isso afeta seu trabalho."
                      rows={5}
                      maxLength={2000}
                      className={fieldErrors.description ? 'is-invalid' : ''}
                      aria-invalid={!!fieldErrors.description}
                      aria-describedby={fieldErrors.description ? 'description-error' : 'description-hint'}
                    />
                    {fieldErrors.description
                      ? renderError('description-error', fieldErrors.description)
                      : (
                        <span id="description-hint" className="pub-field__hint otp-counter">
                          <span>Mínimo de 10 caracteres.</span>
                          <span>{formData.description.length}/2000</span>
                        </span>
                      )}

                    {(suggestionsLoading || articleSuggestions.length > 0) && (
                      <div className="otp-kb">
                        <p className="otp-kb__head">
                          <i className="ti ti-bulb" aria-hidden="true" />
                          {suggestionsLoading ? 'Procurando artigos que podem ajudar…' : 'Isto pode resolver sem chamado'}
                        </p>
                        {articleSuggestions.map(article => (
                          <a
                            key={article.id}
                            href={`/central#${article.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="otp-kb__item"
                          >
                            <span>
                              <small>{article.category}</small>
                              {article.title}
                            </span>
                            <i className="ti ti-external-link" aria-hidden="true" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* RH extra fields based on category */}
                  {formData.ticketDepartment === 'rh' && formData.category === 'RH_ATESTADO' && (
                    <>
                      <div className="pub-field">
                        <label htmlFor="medicalLeaveDays">Dias de afastamento</label>
                        <input
                          id="medicalLeaveDays"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={formData.requestDetails.medicalLeaveDays || ''}
                          onChange={e => handleRequestDetailChange('medicalLeaveDays', e.target.value)}
                          placeholder="Ex.: 3"
                        />
                      </div>
                      <div className="pub-field">
                        <label htmlFor="adjustmentDateAtestado">
                          Data do atestado <span className="pub-field__optional">(opcional)</span>
                        </label>
                        <input
                          id="adjustmentDateAtestado"
                          type="date"
                          value={formData.requestDetails.adjustmentDate || ''}
                          onChange={e => handleRequestDetailChange('adjustmentDate', e.target.value)}
                        />
                      </div>
                      <div className="pub-field">
                        <label htmlFor="rhNotesAtestado">
                          Observações <span className="pub-field__optional">(opcional)</span>
                        </label>
                        <textarea
                          id="rhNotesAtestado"
                          value={formData.requestDetails.notes || ''}
                          onChange={e => handleRequestDetailChange('notes', e.target.value)}
                          rows={2}
                        />
                      </div>
                    </>
                  )}

                  {formData.ticketDepartment === 'rh' && formData.category === 'RH_PONTO' && (
                    <div className="otp-adjustments">
                      <p className="pub-field__hint">
                        Inclua todas as datas do mês que precisam de correção neste mesmo chamado.
                      </p>
                      {rhAdjustments.map((adjustment, index) => (
                        <fieldset key={index} className="otp-adjustment">
                          <legend>
                            Data {index + 1}
                            {rhAdjustments.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeRhAdjustment(index)}
                                className="otp-adjustment__remove"
                              >
                                Remover
                              </button>
                            )}
                          </legend>
                          <div className="otp-adjustment__grid">
                            <div className="pub-field">
                              <label htmlFor={`adjustmentDate-${index}`}>Dia</label>
                              <input
                                id={`adjustmentDate-${index}`}
                                type="date"
                                value={adjustment.date}
                                onChange={e => updateRhAdjustment(index, 'date', e.target.value)}
                              />
                            </div>
                            <div className="pub-field">
                              <label htmlFor={`correctedTime-${index}`}>Horário correto</label>
                              <input
                                id={`correctedTime-${index}`}
                                type="time"
                                value={adjustment.correctedTime}
                                onChange={e => updateRhAdjustment(index, 'correctedTime', e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="pub-field">
                            <label htmlFor={`adjustmentNotes-${index}`}>
                              Justificativa <span className="pub-field__optional">(opcional)</span>
                            </label>
                            <textarea
                              id={`adjustmentNotes-${index}`}
                              value={adjustment.notes}
                              onChange={e => updateRhAdjustment(index, 'notes', e.target.value)}
                              placeholder="Por que o registro precisa ser corrigido"
                              rows={2}
                            />
                          </div>
                        </fieldset>
                      ))}
                      <button type="button" onClick={addRhAdjustment} className="otp-add">
                        <i className="ti ti-plus" aria-hidden="true" />
                        Adicionar outra data
                      </button>
                    </div>
                  )}

                  {formData.ticketDepartment === 'rh' && formData.category === 'RH_FOLHA' && (
                    <>
                      <div className="pub-field">
                        <label htmlFor="payrollMonth">Mês de referência</label>
                        <input
                          id="payrollMonth"
                          type="month"
                          value={formData.requestDetails.payrollMonth || ''}
                          onChange={e => handleRequestDetailChange('payrollMonth', e.target.value)}
                        />
                      </div>
                      <div className="pub-field">
                        <label htmlFor="rhNotesFolha">
                          Observações <span className="pub-field__optional">(opcional)</span>
                        </label>
                        <textarea
                          id="rhNotesFolha"
                          value={formData.requestDetails.notes || ''}
                          onChange={e => handleRequestDetailChange('notes', e.target.value)}
                          rows={2}
                        />
                      </div>
                    </>
                  )}

                  {formData.ticketDepartment === 'rh' && ['RH_DECLARACAO', 'RH_BENEFICIOS', 'RH_OUTROS'].includes(formData.category) && (
                    <div className="pub-field">
                      <label htmlFor="rhNotesOther">Detalhes para o RH</label>
                      <textarea
                        id="rhNotesOther"
                        value={formData.requestDetails.notes || ''}
                        onChange={e => handleRequestDetailChange('notes', e.target.value)}
                        placeholder="Qual documento, benefício ou informação você precisa"
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Attachments */}
                  <div className="pub-field">
                    <span className="pub-field__label">
                      Anexos <span className="pub-field__optional">(opcional)</span>
                    </span>
                    <label
                      htmlFor="open-ticket-file-input"
                      className="otp-drop"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const dropped = Array.from(e.dataTransfer.files);
                        setPendingFiles((prev) => [...prev, ...dropped]);
                      }}
                    >
                      <i className="ti ti-paperclip" aria-hidden="true" />
                      <span>
                        <strong>Adicionar foto ou arquivo</strong>
                        <small>PDF, Word, Excel, imagens ou ZIP, até 10 MB cada</small>
                      </span>
                    </label>
                    <input
                      id="open-ticket-file-input"
                      className="pub-sr-only"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.xls,.xlsx"
                      onChange={(e) => {
                        const selected = Array.from(e.target.files || []);
                        setPendingFiles((prev) => [...prev, ...selected]);
                        e.target.value = '';
                      }}
                    />
                    {pendingFiles.length > 0 && (
                      <ul className="otp-files">
                        {pendingFiles.map((f, i) => (
                          <li key={i}>
                            <i className="ti ti-file" aria-hidden="true" />
                            <span className="otp-files__name">{f.name}</span>
                            <span className="otp-files__size">{(f.size / 1024).toFixed(0)} KB</span>
                            <button
                              type="button"
                              aria-label={`Remover ${f.name}`}
                              onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                            >
                              <i className="ti ti-x" aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Confirmation */}
            {currentStep === 5 && (
              <div className="otp-step" data-step="5">
                <dl className="otp-review">
                  <div className="otp-review__row">
                    <dt>Equipe e assunto</dt>
                    <dd>{departmentMeta?.label}{categoryMeta ? `, ${categoryMeta.label}` : ''}</dd>
                    <button type="button" onClick={() => goToStep(1)}>Alterar</button>
                  </div>
                  <div className="otp-review__row">
                    <dt>Solicitante</dt>
                    <dd>
                      {formData.name}
                      <span>{formData.email}</span>
                      {(formData.department || formData.unit) && (
                        <span>{[formData.department, formData.unit].filter(Boolean).join(', ')}</span>
                      )}
                    </dd>
                    <button type="button" onClick={() => goToStep(3)}>Alterar</button>
                  </div>
                  <div className="otp-review__row">
                    <dt>Pedido</dt>
                    <dd>
                      <strong>{formData.title}</strong>
                      <span className="otp-review__text">{formData.description}</span>
                      {pendingFiles.length > 0 && (
                        <span>{pendingFiles.length} {pendingFiles.length === 1 ? 'anexo' : 'anexos'}</span>
                      )}
                    </dd>
                    <button type="button" onClick={() => goToStep(4)}>Alterar</button>
                  </div>
                  {formData.ticketDepartment === 'ti' && (
                    <div className="otp-review__row">
                      <dt>Prioridade</dt>
                      <dd>
                        <span className={`otp-priority otp-priority--${formData.priority}`}>
                          {PRIORITY_LABEL[formData.priority]}
                        </span>
                        <span>Calculada pelo sistema a partir do assunto e da descrição.</span>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {showActionBar && (
              <div className="otp-bar">
                <div className="otp-bar__inner">
                  {/* Chaves distintas: se o React reaproveitasse o mesmo botão e
                      trocasse type="button" por "submit" durante o clique em
                      Continuar, o formulário seria enviado na etapa 4. */}
                  {currentStep < TOTAL_STEPS ? (
                    <button
                      key="next"
                      type="button"
                      onClick={handleNextStep}
                      className="pub-btn pub-btn--primary pub-btn--block"
                      disabled={!isStepValid(currentStep)}
                    >
                      Continuar
                    </button>
                  ) : (
                    <button
                      key="submit"
                      type="submit"
                      className="pub-btn pub-btn--primary pub-btn--block"
                      disabled={loading}
                    >
                      {loading ? 'Enviando…' : 'Enviar chamado'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        <aside className="otp-aside" aria-label="Resumo do chamado">
          <h2>Seu chamado</h2>
          <dl>
            <div>
              <dt>Equipe</dt>
              <dd className={!departmentMeta ? 'is-empty' : ''}>{departmentMeta?.label ?? 'Ainda não escolhida'}</dd>
            </div>
            <div>
              <dt>Assunto</dt>
              <dd className={!categoryMeta ? 'is-empty' : ''}>{categoryMeta?.label ?? 'Ainda não escolhido'}</dd>
            </div>
            <div>
              <dt>Resumo</dt>
              <dd className={!formData.title ? 'is-empty' : ''}>{formData.title || 'Ainda não escrito'}</dd>
            </div>
            {formData.ticketDepartment === 'ti' && (
              <div>
                <dt>Prioridade</dt>
                <dd>
                  <span className={`otp-priority otp-priority--${formData.priority}`}>
                    {PRIORITY_LABEL[formData.priority]}
                  </span>
                </dd>
              </div>
            )}
            <div>
              <dt>Solicitante</dt>
              <dd className={!formData.name ? 'is-empty' : ''}>{formData.name || 'Ainda não informado'}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
