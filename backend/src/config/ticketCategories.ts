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
