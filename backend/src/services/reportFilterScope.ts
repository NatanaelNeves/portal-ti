import { UserRole } from '../types/enums';

export type ServiceDepartment = 'ti' | 'rh' | 'administrativo';

const SERVICE_DEPARTMENTS = new Set<ServiceDepartment>(['ti', 'rh', 'administrativo']);

const ROLE_DEPARTMENT_SCOPE: Partial<Record<UserRole, ServiceDepartment>> = {
  [UserRole.IT_STAFF]: 'ti',
  [UserRole.RH_STAFF]: 'rh',
  [UserRole.ADMIN_STAFF]: 'administrativo',
};

export const canSelectServiceDepartment = (role: UserRole | string): boolean =>
  role === UserRole.ADMIN || role === UserRole.MANAGER;

export const resolveServiceDepartment = (
  role: UserRole | string,
  requestedDepartment: unknown,
): ServiceDepartment | null => {
  const forcedDepartment = ROLE_DEPARTMENT_SCOPE[role as UserRole];
  if (forcedDepartment) return forcedDepartment;

  const normalized = String(requestedDepartment ?? '').trim().toLowerCase();
  return SERVICE_DEPARTMENTS.has(normalized as ServiceDepartment)
    ? normalized as ServiceDepartment
    : null;
};

export const normalizeRequesterDepartment = (value: unknown): string | null => {
  const normalized = String(value ?? '').trim();
  if (!normalized || normalized.toLowerCase() === 'all') return null;
  return normalized.slice(0, 160);
};

interface AppendTicketReportFiltersOptions {
  conditions: string[];
  params: unknown[];
  alias?: string;
  serviceDepartment?: ServiceDepartment | null;
  requesterDepartment?: string | null;
}

export const appendTicketReportFilters = ({
  conditions,
  params,
  alias = 't',
  serviceDepartment,
  requesterDepartment,
}: AppendTicketReportFiltersOptions): void => {
  if (serviceDepartment) {
    params.push(serviceDepartment);
    conditions.push(`COALESCE(${alias}.department, 'ti') = $${params.length}`);
  }

  if (requesterDepartment) {
    params.push(requesterDepartment);
    conditions.push(`LOWER(TRIM(COALESCE(pu.department, d_req.name, ''))) = LOWER(TRIM($${params.length}))`);
  }
};

export const serviceDepartmentLabel = (department: string): string => {
  if (department === 'rh') return 'Recursos Humanos';
  if (department === 'administrativo') return 'Administrativo';
  return 'TI';
};
