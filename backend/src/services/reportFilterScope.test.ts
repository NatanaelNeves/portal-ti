import { UserRole } from '../types/enums';
import {
  appendTicketReportFilters,
  canSelectServiceDepartment,
  resolveServiceDepartment,
} from './reportFilterScope';

describe('reportFilterScope', () => {
  it('keeps Administrador role separate from the Administrativo service department', () => {
    expect(resolveServiceDepartment(UserRole.ADMIN, 'rh')).toBe('rh');
    expect(resolveServiceDepartment(UserRole.ADMIN, 'administrativo')).toBe('administrativo');
    expect(resolveServiceDepartment(UserRole.ADMIN, 'all')).toBeNull();
    expect(canSelectServiceDepartment(UserRole.ADMIN)).toBe(true);
  });

  it('forces operational roles to their own service department', () => {
    expect(resolveServiceDepartment(UserRole.IT_STAFF, 'rh')).toBe('ti');
    expect(resolveServiceDepartment(UserRole.RH_STAFF, 'ti')).toBe('rh');
    expect(resolveServiceDepartment(UserRole.ADMIN_STAFF, 'ti')).toBe('administrativo');
    expect(canSelectServiceDepartment(UserRole.IT_STAFF)).toBe(false);
    expect(canSelectServiceDepartment(UserRole.RH_STAFF)).toBe(false);
    expect(canSelectServiceDepartment(UserRole.ADMIN_STAFF)).toBe(false);
  });

  it('adds both responsible-team and requester-sector filters to report queries', () => {
    const conditions: string[] = [];
    const params: unknown[] = [];

    appendTicketReportFilters({
      conditions,
      params,
      alias: 't',
      serviceDepartment: 'ti',
      requesterDepartment: 'Recursos Humanos',
    });

    expect(conditions).toEqual([
      "COALESCE(t.department, 'ti') = $1",
      "LOWER(TRIM(COALESCE(pu.department, d_req.name, ''))) = LOWER(TRIM($2))",
    ]);
    expect(params).toEqual(['ti', 'Recursos Humanos']);
  });
});
