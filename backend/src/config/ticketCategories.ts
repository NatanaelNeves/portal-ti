export type TicketSector = 'TI' | 'ADM' | 'RH';
export type RhCategoryVisibility = 'public' | 'internal';

export type RhCategorySchema = {
  required: string[];
  optional?: string[];
  visibility: RhCategoryVisibility;
};

export const RH_CATEGORY_SCHEMAS: Record<string, RhCategorySchema> = {
  RH_ATESTADO: {
    required: ['medicalLeaveDays'],
    optional: ['adjustmentDate', 'notes'],
    visibility: 'public',
  },
  RH_PONTO: {
    required: ['adjustmentDate'],
    optional: ['correctedTime', 'adjustments', 'notes'],
    visibility: 'public',
  },
  // Senha bloqueada ou sem acesso ao aplicativo do ponto (iPonto).
  // Quem resolve é o RH, não a TI.
  RH_ACESSO_PONTO: {
    required: [],
    optional: ['notes'],
    visibility: 'public',
  },
  RH_FOLHA: {
    required: ['payrollMonth'],
    optional: ['employeeId', 'notes'],
    visibility: 'public',
  },
  RH_DECLARACAO: {
    required: ['notes'],
    optional: ['employeeId'],
    visibility: 'public',
  },
  RH_BENEFICIOS: {
    required: ['notes'],
    optional: ['employeeId'],
    visibility: 'public',
  },
  RH_OUTROS: {
    required: ['notes'],
    optional: ['employeeId'],
    visibility: 'public',
  },
  RH_CONFIDENCIAL: {
    required: ['notes'],
    optional: ['employeeId'],
    visibility: 'internal',
  },
};

export const RH_CATEGORIES = Object.keys(RH_CATEGORY_SCHEMAS);
export const RH_PUBLIC_CATEGORIES = RH_CATEGORIES.filter(
  (category) => RH_CATEGORY_SCHEMAS[category].visibility === 'public',
);
export const RH_INTERNAL_CATEGORIES = RH_CATEGORIES.filter(
  (category) => RH_CATEGORY_SCHEMAS[category].visibility === 'internal',
);

export type ServiceTeam = 'ti' | 'administrativo' | 'rh';

// Assuntos que cada equipe recebe, os mesmos do formulário de abertura.
// Usado ao encaminhar um chamado de uma equipe para outra.
export const TEAM_CATEGORIES: Record<ServiceTeam, string[]> = {
  ti: ['computador', 'internet', 'impressora', 'sistema', 'outro'],
  administrativo: ['copia_chave', 'apoio_evento', 'buscar_doacao', 'solicitar_documento', 'outro'],
  rh: RH_PUBLIC_CATEGORIES,
};

export const TEAM_DEFAULT_CATEGORY: Record<ServiceTeam, string> = {
  ti: 'outro',
  administrativo: 'outro',
  rh: 'RH_OUTROS',
};

export const CATEGORY_SECTOR_MAP: Record<string, TicketSector> = {
  // TI categories
  computador: 'TI',
  internet: 'TI',
  impressora: 'TI',
  sistema: 'TI',
  outro: 'TI',

  // Administrativo categories
  copia_chave: 'ADM',
  apoio_evento: 'ADM',
  buscar_doacao: 'ADM',
  solicitar_documento: 'ADM',

  // RH categories
  RH_ATESTADO: 'RH',
  RH_PONTO: 'RH',
  RH_ACESSO_PONTO: 'RH',
  RH_FOLHA: 'RH',
  RH_DECLARACAO: 'RH',
  RH_BENEFICIOS: 'RH',
  RH_OUTROS: 'RH',
  RH_CONFIDENCIAL: 'RH',
};

export const getCategorySector = (
  category?: string | null,
  department?: string | null,
): TicketSector => {
  if (category && CATEGORY_SECTOR_MAP[category]) {
    return CATEGORY_SECTOR_MAP[category];
  }

  if (department === 'administrativo') {
    return 'ADM';
  }

  return 'TI';
};

export const isRhCategory = (category?: string | null): boolean => {
  if (!category) return false;
  return RH_CATEGORIES.includes(category);
};

export const isRhPublicCategory = (category?: string | null): boolean => {
  if (!category) return false;
  return RH_PUBLIC_CATEGORIES.includes(category);
};

export const isRhInternalCategory = (category?: string | null): boolean => {
  if (!category) return false;
  return RH_INTERNAL_CATEGORIES.includes(category);
};
