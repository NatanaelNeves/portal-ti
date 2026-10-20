/**
 * Assuntos de chamado de cada equipe, os mesmos do formulário de abertura.
 * O backend confere a mesma lista em `config/ticketCategories.ts`.
 */
export type ServiceTeam = 'ti' | 'administrativo' | 'rh';

export interface CategoryOption {
  value: string;
  label: string;
  /** Classe do Tabler Icons. */
  icon: string;
}

export const TI_CATEGORIES: CategoryOption[] = [
  { value: 'computador', label: 'Computador', icon: 'ti-device-desktop' },
  { value: 'internet', label: 'Internet', icon: 'ti-wifi' },
  { value: 'impressora', label: 'Impressora', icon: 'ti-printer' },
  { value: 'sistema', label: 'Sistema', icon: 'ti-apps' },
  { value: 'outro', label: 'Outro assunto', icon: 'ti-dots' },
];

export const ADMIN_CATEGORIES: CategoryOption[] = [
  { value: 'copia_chave', label: 'Cópia de chave', icon: 'ti-key' },
  { value: 'apoio_evento', label: 'Apoio em evento', icon: 'ti-calendar-event' },
  { value: 'buscar_doacao', label: 'Buscar doação', icon: 'ti-package' },
  { value: 'solicitar_documento', label: 'Solicitar documento', icon: 'ti-file-text' },
  { value: 'outro', label: 'Outro assunto', icon: 'ti-dots' },
];

// RH_CONFIDENCIAL fica de fora: só o RH abre, e nunca por aqui.
export const RH_CATEGORIES: CategoryOption[] = [
  { value: 'RH_ATESTADO', label: 'Atestado médico', icon: 'ti-stethoscope' },
  { value: 'RH_PONTO', label: 'Ajuste de ponto', icon: 'ti-clock-edit' },
  { value: 'RH_ACESSO_PONTO', label: 'Acesso ao iPonto', icon: 'ti-lock-access' },
  { value: 'RH_FOLHA', label: 'Folha de pagamento', icon: 'ti-cash' },
  { value: 'RH_DECLARACAO', label: 'Declaração', icon: 'ti-file-certificate' },
  { value: 'RH_BENEFICIOS', label: 'Benefícios', icon: 'ti-gift' },
  { value: 'RH_OUTROS', label: 'Outro assunto', icon: 'ti-dots' },
];

export const TEAM_CATEGORIES: Record<ServiceTeam, CategoryOption[]> = {
  ti: TI_CATEGORIES,
  administrativo: ADMIN_CATEGORIES,
  rh: RH_CATEGORIES,
};

export const TEAM_DEFAULT_CATEGORY: Record<ServiceTeam, string> = {
  ti: 'outro',
  administrativo: 'outro',
  rh: 'RH_OUTROS',
};

/**
 * Ponto e iPonto são com o RH, mas muita gente abre para a TI ("minha senha
 * do iPonto está bloqueada"). Usado para sugerir o RH ao abrir e ao encaminhar.
 */
const plainText = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const PONTO_PATTERN = /\bi-?\s?ponto\b|\b(bater|batida|marcar|marcacao|registrar|registro|ajuste|ajustar|corrigir)( de| do| no)?( o)? ponto\b|\bponto eletronico\b/;
const PONTO_ADJUSTMENT_PATTERN = /\b(ajust|corrig|esqueci)/;

export const mentionsPonto = (text: string) => PONTO_PATTERN.test(plainText(text));

/** Ajuste de horário ou acesso ao aplicativo, pelo que a pessoa escreveu. */
export const pontoCategory = (text: string) =>
  PONTO_ADJUSTMENT_PATTERN.test(plainText(text)) ? 'RH_PONTO' : 'RH_ACESSO_PONTO';
